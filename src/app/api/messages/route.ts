import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatWithGroq, analyzeLeadIntent, calculateLeadScore } from '@/lib/ai';

// GET - Listar mensajes de una conversación
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'conversationId es requerido' },
        { status: 400 }
      );
    }

    const messages = await db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener mensajes' },
      { status: 500 }
    );
  }
}

// POST - Enviar mensaje (y obtener respuesta de IA)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversationId,
      content,
      direction = 'incoming',
      messageType = 'text',
      mediaUrl,
      externalId,
      autoReply = true,
    } = body;

    if (!conversationId || !content) {
      return NextResponse.json(
        { success: false, error: 'conversationId y content son requeridos' },
        { status: 400 }
      );
    }

    // Obtener conversación
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        lead: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    // Guardar mensaje
    const message = await db.message.create({
      data: {
        conversationId,
        content,
        direction,
        messageType,
        mediaUrl,
        externalId,
        isFromBot: direction === 'outgoing',
        status: 'sent',
      },
    });

    // Actualizar conversación
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: content.substring(0, 200),
        lastMessageAt: new Date(),
        lastMessageDir: direction,
        unreadCount: direction === 'incoming' ? { increment: 1 } : undefined,
      },
    });

    // Analizar intención si es mensaje entrante
    if (direction === 'incoming') {
      const intent = analyzeLeadIntent(content);

      // Actualizar lead
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
          where: { id: conversationId },
          data: {
            leadScore: newScore,
            leadStatus: newStatus,
          },
        });
      }
    }

    // Auto-respuesta con IA
    let aiResponse = null;
    if (direction === 'incoming' && autoReply) {
      try {
        // Obtener historial de mensajes
        const history = conversation.messages
          .reverse()
          .slice(-10)
          .map(m => ({
            role: m.direction === 'incoming' ? 'user' : 'assistant',
            content: m.content,
          }));

        // Agregar el mensaje actual
        history.push({ role: 'user', content });

        // Obtener respuesta de IA
        const response = await chatWithGroq(history);

        // Guardar respuesta
        aiResponse = await db.message.create({
          data: {
            conversationId,
            content: response,
            direction: 'outgoing',
            messageType: 'text',
            isFromBot: true,
            status: 'sent',
          },
        });

        // Actualizar conversación con la respuesta
        await db.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessage: response.substring(0, 200),
            lastMessageAt: new Date(),
            lastMessageDir: 'outgoing',
          },
        });
      } catch (error) {
        console.error('Error in AI response:', error);
        // No fallar si la IA no responde
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message,
        aiResponse,
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { success: false, error: 'Error al enviar mensaje' },
      { status: 500 }
    );
  }
}
