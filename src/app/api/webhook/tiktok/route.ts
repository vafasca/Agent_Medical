import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatWithGroq, analyzeLeadIntent, calculateLeadScore } from '@/lib/ai';

// POST - Recibir mensajes de TikTok
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TikTok envía mensajes en este formato
    const messageData = body.data?.message || body.message;
    const senderId = messageData?.from?.id || body.sender_id;
    const content = messageData?.content || body.content || messageData?.text;

    if (!content || !senderId) {
      return NextResponse.json({ status: 'empty_message' });
    }

    const connection = await db.socialConnection.findFirst({
      where: {
        platform: 'tiktok',
        isActive: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ status: 'no_connection' });
    }

    // Buscar o crear conversación
    let conversation = await db.conversation.findFirst({
      where: {
        platform: 'tiktok',
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
          platform: 'tiktok',
          platformUserId: senderId,
          name: `TikTok User ${senderId.substring(0, 8)}`,
          socialConnectionId: connection.id,
        },
        include: { messages: true, lead: true },
      });

      await db.lead.create({
        data: {
          conversationId: conversation.id,
          source: 'tiktok',
        },
      });
    }

    // Guardar mensaje
    await db.message.create({
      data: {
        conversationId: conversation.id,
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

    // Enviar respuesta por TikTok API (requiere configuración adicional)
    // TikTok API es más restrictiva y requiere tokens específicos

    return NextResponse.json({ success: true, status: 'processed', aiResponse });
  } catch (error) {
    console.error('Error processing TikTok webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Error processing webhook' },
      { status: 500 }
    );
  }
}
