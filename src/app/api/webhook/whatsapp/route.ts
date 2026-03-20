import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatWithGroq, analyzeLeadIntent, calculateLeadScore } from '@/lib/ai';

// GET - Verificación del webhook (WhatsApp Business API)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verificar token
  const connection = await db.socialConnection.findFirst({
    where: {
      platform: 'whatsapp',
      verifyToken: token,
      isActive: true,
    },
  });

  if (mode === 'subscribe' && connection && token === connection.verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// POST - Recibir mensajes de WhatsApp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verificar que es un mensaje de WhatsApp
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' });
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.length) {
      return NextResponse.json({ status: 'no_messages' });
    }

    const message = value.messages[0];
    const from = message.from; // Número de teléfono del remitente
    const messageId = message.id;
    const messageType = message.type;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    // Obtener contenido del mensaje
    let content = '';
    if (messageType === 'text') {
      content = message.text?.body || '';
    } else if (messageType === 'audio') {
      content = '[Audio]';
    } else if (messageType === 'image') {
      content = message.image?.caption || '[Imagen]';
    } else if (messageType === 'document') {
      content = message.document?.caption || '[Documento]';
    }

    if (!content) {
      return NextResponse.json({ status: 'empty_message' });
    }

    // Buscar conexión activa
    const connection = await db.socialConnection.findFirst({
      where: {
        platform: 'whatsapp',
        isActive: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ status: 'no_connection' });
    }

    // Buscar o crear conversación
    let conversation = await db.conversation.findFirst({
      where: {
        platform: 'whatsapp',
        externalId: from,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        lead: true,
      },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          externalId: from,
          platform: 'whatsapp',
          phone: from,
          name: from,
          socialConnectionId: connection.id,
        },
        include: {
          messages: true,
          lead: true,
        },
      });

      // Crear lead
      await db.lead.create({
        data: {
          conversationId: conversation.id,
          phone: from,
          source: 'whatsapp',
        },
      });
    }

    // Guardar mensaje recibido
    await db.message.create({
      data: {
        conversationId: conversation.id,
        externalId: messageId,
        content,
        direction: 'incoming',
        messageType: messageType === 'text' ? 'text' : 'document',
        createdAt: timestamp,
      },
    });

    // Actualizar conversación
    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: content.substring(0, 200),
        lastMessageAt: new Date(),
        lastMessageDir: 'incoming',
        unreadCount: { increment: 1 },
      },
    });

    // Analizar intención
    const intent = analyzeLeadIntent(content);

    // Construir historial para IA
    const chatHistory = [
      ...(conversation.messages || [])
        .reverse()
        .slice(-10)
        .map(m => ({
          role: m.direction === 'incoming' ? 'user' as const : 'assistant' as const,
          content: m.content,
        })),
      { role: 'user' as const, content },
    ];

    // Obtener respuesta de IA
    const aiResponse = await chatWithGroq(chatHistory);

    // Guardar respuesta
    await db.message.create({
      data: {
        conversationId: conversation.id,
        content: aiResponse,
        direction: 'outgoing',
        messageType: 'text',
        isFromBot: true,
      },
    });

    // Actualizar conversación con respuesta
    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: aiResponse.substring(0, 200),
        lastMessageAt: new Date(),
        lastMessageDir: 'outgoing',
      },
    });

    // Actualizar lead scoring
    if (conversation.lead) {
      const allMessages = [content, ...conversation.messages.map(m => m.content)];
      const newScore = calculateLeadScore(allMessages, conversation.lead.score);

      let newStatus = conversation.leadStatus;
      if (intent.interest === 'high' && conversation.leadStatus === 'new') {
        newStatus = 'interested';
      } else if (intent.interest === 'high' && conversation.leadStatus === 'interested') {
        newStatus = 'qualified';
      }

      await db.lead.update({
        where: { id: conversation.lead.id },
        data: {
          score: newScore,
          interest: intent.topics.join(', ') || conversation.lead.interest,
        },
      });

      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          leadScore: newScore,
          leadStatus: newStatus,
        },
      });
    }

    // Enviar respuesta por WhatsApp API
    if (connection.accessToken && connection.phoneNumberId) {
      await fetch(
        `https://graph.facebook.com/v18.0/${connection.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${connection.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: from,
            type: 'text',
            text: { body: aiResponse },
          }),
        }
      );
    }

    return NextResponse.json({
      success: true,
      status: 'processed',
      intent,
    });
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Error processing webhook' },
      { status: 500 }
    );
  }
}
