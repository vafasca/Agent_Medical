import { NextRequest, NextResponse } from 'next/server';

import { analyzeLeadIntent, calculateLeadScore, chatWithGroq } from '@/lib/ai';
import { db } from '@/lib/db';

function mapInterestToStage(interest: 'low' | 'medium' | 'high') {
  if (interest === 'high') return 'decision';
  if (interest === 'medium') return 'consideration';
  return 'awareness';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message;

    if (!message?.text) {
      return NextResponse.json({ status: 'ignored', reason: 'no_text_message' });
    }

    const chatId = String(message.chat?.id || message.from?.id || '');
    const userId = String(message.from?.id || chatId);
    const text = String(message.text || '').trim();
    const senderName = message.from?.first_name || message.from?.username || message.chat?.title || 'Usuario';

    const connection = await db.socialConnection.findFirst({
      where: { platform: 'telegram', isActive: true, botToken: { not: null } },
      orderBy: { updatedAt: 'desc' },
    });

    if (!connection?.botToken) {
      return NextResponse.json({ status: 'no_connection' }, { status: 400 });
    }

    let conversation = await db.conversation.findUnique({
      where: { externalId: `telegram:${chatId}` },
      include: { messages: true, lead: true },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          externalId: `telegram:${chatId}`,
          platform: 'telegram',
          platformUserId: userId,
          name: senderName,
          username: message.from?.username || null,
          status: 'active',
          leadStatus: 'new',
          leadScore: 0,
          lastMessage: text.slice(0, 500),
          lastMessageAt: new Date(),
          lastMessageDir: 'incoming',
          unreadCount: 1,
        },
        include: { messages: true, lead: true },
      });
    }

    await db.message.create({
      data: {
        conversationId: conversation.id,
        externalId: String(message.message_id || Date.now()),
        content: text,
        direction: 'incoming',
        messageType: 'text',
        isFromBot: false,
      },
    });

    const history = await db.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const aiResponse = await chatWithGroq(
      history.map((item) => ({
        role: item.isFromBot ? 'assistant' as const : 'user' as const,
        content: item.content,
      }))
    );

    await db.message.create({
      data: {
        conversationId: conversation.id,
        content: aiResponse,
        direction: 'outgoing',
        messageType: 'text',
        isFromBot: true,
        status: 'sent',
      },
    });

    const intent = analyzeLeadIntent(text);
    const newScore = calculateLeadScore(history.map((item) => item.content).concat(text), conversation.leadScore);
    const stage = mapInterestToStage(intent.interest);

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        name: senderName,
        username: message.from?.username || null,
        leadScore: newScore,
        leadStatus: intent.interest === 'high' ? 'qualified' : intent.interest === 'medium' ? 'interested' : 'new',
        lastMessage: text.slice(0, 500),
        lastMessageAt: new Date(),
        lastMessageDir: 'incoming',
        unreadCount: { increment: 1 },
      },
    });

    if (conversation.lead) {
      await db.lead.update({
        where: { conversationId: conversation.id },
        data: {
          name: senderName,
          interest: intent.topics.join(', ') || null,
          score: newScore,
          stage,
          source: 'telegram',
        },
      });
    } else {
      await db.lead.create({
        data: {
          conversationId: conversation.id,
          name: senderName,
          interest: intent.topics.join(', ') || null,
          score: newScore,
          stage,
          source: 'telegram',
        },
      });
    }

    const telegramResponse = await fetch(`https://api.telegram.org/bot${connection.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: aiResponse,
      }),
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      console.error('Telegram sendMessage error:', errorText);
    }

    return NextResponse.json({ status: 'ok', reply: aiResponse });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    return NextResponse.json({ status: 'error', error: error instanceof Error ? error.message : 'unknown' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost:3000';
  const webhookUrl = `${protocol}://${host}/api/webhook/telegram`;

  return NextResponse.json({
    success: true,
    message: 'Webhook de Telegram activo',
    webhookUrl,
    instructions: {
      step1: 'Crea un bot con @BotFather y copia el bot token.',
      step2: 'Guarda la conexión Telegram en Configuración > Conexiones.',
      step3: `Ejecuta: curl "https://api.telegram.org/bot<TU_BOT_TOKEN>/setWebhook?url=${webhookUrl}"`,
      step4: 'Escribe al bot en Telegram para generar conversaciones, leads y respuestas automáticas.',
    },
  });
}
