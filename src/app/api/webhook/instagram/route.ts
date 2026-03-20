import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatWithGroq, analyzeLeadIntent, calculateLeadScore } from '@/lib/ai';

// GET - Verificación del webhook
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const connection = await db.socialConnection.findFirst({
    where: {
      platform: 'instagram',
      verifyToken: token,
      isActive: true,
    },
  });

  if (mode === 'subscribe' && connection && token === connection.verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// POST - Recibir mensajes de Instagram
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.object !== 'instagram') {
      return NextResponse.json({ status: 'ignored' });
    }

    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (!messaging) {
      return NextResponse.json({ status: 'no_messaging' });
    }

    const senderId = messaging.sender?.id;
    const message = messaging.message;
    const content = message?.text || '';

    if (!content || !senderId) {
      return NextResponse.json({ status: 'empty_message' });
    }

    const connection = await db.socialConnection.findFirst({
      where: {
        platform: 'instagram',
        isActive: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ status: 'no_connection' });
    }

    // Buscar o crear conversación
    let conversation = await db.conversation.findFirst({
      where: {
        platform: 'instagram',
        externalId: senderId,
      },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 20 },
        lead: true,
      },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          externalId: senderId,
          platform: 'instagram',
          platformUserId: senderId,
          name: `Instagram User ${senderId.substring(0, 8)}`,
          socialConnectionId: connection.id,
        },
        include: { messages: true, lead: true },
      });

      await db.lead.create({
        data: {
          conversationId: conversation.id,
          source: 'instagram',
        },
      });
    }

    // Guardar mensaje
    await db.message.create({
      data: {
        conversationId: conversation.id,
        externalId: message?.mid,
        content,
        direction: 'incoming',
        messageType: 'text',
      },
    });

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: content.substring(0, 200),
        lastMessageAt: new Date(),
        lastMessageDir: 'incoming',
        unreadCount: { increment: 1 },
      },
    });

    // Obtener respuesta de IA
    const intent = analyzeLeadIntent(content);
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

    const aiResponse = await chatWithGroq(chatHistory);

    await db.message.create({
      data: {
        conversationId: conversation.id,
        content: aiResponse,
        direction: 'outgoing',
        messageType: 'text',
        isFromBot: true,
      },
    });

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: aiResponse.substring(0, 200),
        lastMessageAt: new Date(),
        lastMessageDir: 'outgoing',
      },
    });

    // Actualizar lead
    if (conversation.lead) {
      const allMessages = [content, ...conversation.messages.map(m => m.content)];
      const newScore = calculateLeadScore(allMessages, conversation.lead.score);

      let newStatus = conversation.leadStatus;
      if (intent.interest === 'high' && conversation.leadStatus === 'new') {
        newStatus = 'interested';
      }

      await db.lead.update({
        where: { id: conversation.lead.id },
        data: { score: newScore },
      });

      await db.conversation.update({
        where: { id: conversation.id },
        data: { leadScore: newScore, leadStatus: newStatus },
      });
    }

    // Enviar respuesta por Instagram API
    if (connection.accessToken) {
      await fetch(
        `https://graph.facebook.com/v18.0/me/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: senderId },
            message: { text: aiResponse },
            access_token: connection.accessToken,
          }),
        }
      );
    }

    return NextResponse.json({ success: true, status: 'processed' });
  } catch (error) {
    console.error('Error processing Instagram webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Error processing webhook' },
      { status: 500 }
    );
  }
}
