import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = '/home/z/my-project/data';
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const SOCIAL_FILE = path.join(DATA_DIR, 'social.json');
const API_KEYS_FILE = path.join(DATA_DIR, 'api-keys.json');
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'knowledge.json');

// Interfaces
interface Message {
  id: string;
  content: string;
  direction: 'incoming' | 'outgoing';
  messageType: string;
  isFromBot: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  externalId: string;
  platform: string;
  name: string | null;
  username: string | null;
  phone: string | null;
  status: string;
  leadStatus: string;
  leadScore: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageDir: string | null;
  unreadCount: number;
  messages: Message[];
  createdAt: string;
}

interface Lead {
  id: string;
  conversationId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null;
  score: number;
  stage: string;
  notes: string | null;
  source: string;
  createdAt: string;
}

interface SocialConnection {
  id: string;
  platform: string;
  name: string;
  botToken: string | null;
  accessToken: string | null;
  phoneNumberId: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ApiKey {
  id: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  isActive: boolean;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  priority: number;
  isActive: boolean;
}

// Helper functions
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  ensureDataDir();
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// AI Chat function
async function chatWithAI(messages: { role: string; content: string }[]): Promise<string> {
  const apiKeys = readJsonFile<ApiKey[]>(API_KEYS_FILE, []);
  const activeKey = apiKeys.find(k => k.isActive);
  
  if (!activeKey) {
    return 'No hay API key configurada. Por favor, configura una API key en la sección de Configuración.';
  }

  const knowledge = readJsonFile<KnowledgeItem[]>(KNOWLEDGE_FILE, []);
  const activeKnowledge = knowledge
    .filter(k => k.isActive)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10);

  const knowledgeContext = activeKnowledge
    .map(k => `## ${k.title}\n${k.content}`)
    .join('\n\n');

  const systemPrompt = `Eres un asistente virtual profesional especializado en la venta de cursos médicos.

## Información sobre los cursos:
${knowledgeContext || 'Responde de manera útil y profesional.'}

## Instrucciones:
- Responde de manera concisa pero completa
- Si el usuario muestra interés, pregunta si desea más información`;

  let url: string;
  let headers: Record<string, string>;

  if (activeKey.provider === 'openrouter') {
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${activeKey.apiKey}`,
      'HTTP-Referer': 'https://salesbot-ai.local',
      'X-Title': 'SalesBot AI',
    };
  } else if (activeKey.provider === 'groq') {
    url = 'https://api.groq.com/openai/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${activeKey.apiKey}`,
    };
  } else {
    url = `${activeKey.baseUrl}/chat/completions`;
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${activeKey.apiKey}`,
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: activeKey.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No pude generar una respuesta.';
    }
  } catch (error) {
    console.error('Error calling AI:', error);
  }

  return 'Lo siento, no pude procesar tu mensaje en este momento.';
}

// Analyze lead intent
function analyzeLeadIntent(message: string): { interest: string; keywords: string[] } {
  const lowerMessage = message.toLowerCase();
  const buyKeywords = ['precio', 'costo', 'comprar', 'inscribir', 'disponible', 'horario', 'cuando', 'certificado'];
  const infoKeywords = ['información', 'curso', 'temario', 'duración', 'requisito'];
  
  const foundBuy = buyKeywords.filter(k => lowerMessage.includes(k));
  const foundInfo = infoKeywords.filter(k => lowerMessage.includes(k));
  
  if (foundBuy.length >= 2) {
    return { interest: 'high', keywords: foundBuy };
  } else if (foundBuy.length > 0 || foundInfo.length > 0) {
    return { interest: 'medium', keywords: [...foundBuy, ...foundInfo] };
  }
  return { interest: 'low', keywords: [] };
}

// Calculate lead score
function calculateLeadScore(messages: string[], currentScore: number = 0): number {
  let score = currentScore;
  const positiveWords = ['interesado', 'quiero', 'comprar', 'inscribir', 'precio', 'disponible', 'cuando empieza'];
  const negativeWords = ['no me interesa', 'caro', 'después', 'no gracias'];
  
  messages.forEach(msg => {
    const lower = msg.toLowerCase();
    positiveWords.forEach(w => { if (lower.includes(w)) score += 5; });
    negativeWords.forEach(w => { if (lower.includes(w)) score -= 3; });
  });
  
  return Math.max(0, Math.min(100, score));
}

// POST - Recibir mensajes de Telegram
export async function POST(request: NextRequest) {
  console.log('=== Telegram Webhook Received ===');
  
  try {
    const body = await request.json();
    console.log('Telegram payload:', JSON.stringify(body, null, 2));

    const message = body.message;
    if (!message?.text) {
      return NextResponse.json({ status: 'no_text_message' });
    }

    const chatId = message.chat?.id?.toString();
    const userId = message.from?.id?.toString();
    const userName = message.from?.first_name || message.from?.username || 'Usuario';
    const content = message.text;
    const messageId = message.message_id?.toString();

    console.log(`Message from ${userName} (${chatId}): ${content}`);

    // Buscar conexión activa de Telegram
    const connections = readJsonFile<SocialConnection[]>(SOCIAL_FILE, []);
    const connection = connections.find(c => c.platform === 'telegram' && c.isActive);

    if (!connection) {
      console.log('No active Telegram connection found');
      return NextResponse.json({ status: 'no_connection' });
    }

    // Buscar o crear conversación
    const conversations = readJsonFile<Conversation[]>(CONVERSATIONS_FILE, []);
    let conversation = conversations.find(c => c.externalId === chatId);

    if (!conversation) {
      conversation = {
        id: `conv-${Date.now()}`,
        externalId: chatId || userId,
        platform: 'telegram',
        name: userName,
        username: message.from?.username || null,
        phone: null,
        status: 'active',
        leadStatus: 'new',
        leadScore: 0,
        lastMessage: content.substring(0, 200),
        lastMessageAt: new Date().toISOString(),
        lastMessageDir: 'incoming',
        unreadCount: 1,
        messages: [],
        createdAt: new Date().toISOString(),
      };
      conversations.push(conversation);

      // Crear lead
      const leads = readJsonFile<Lead[]>(LEADS_FILE, []);
      leads.push({
        id: `lead-${Date.now()}`,
        conversationId: conversation.id,
        name: userName,
        email: null,
        phone: null,
        interest: null,
        score: 0,
        stage: 'awareness',
        notes: null,
        source: 'telegram',
        createdAt: new Date().toISOString(),
      });
      writeJsonFile(LEADS_FILE, leads);
    }

    // Agregar mensaje entrante
    conversation.messages.push({
      id: `msg-${Date.now()}`,
      content,
      direction: 'incoming',
      messageType: 'text',
      isFromBot: false,
      createdAt: new Date().toISOString(),
    });
    conversation.lastMessage = content.substring(0, 200);
    conversation.lastMessageAt = new Date().toISOString();
    conversation.lastMessageDir = 'incoming';
    conversation.unreadCount += 1;

    // Obtener respuesta de IA
    const chatHistory = conversation.messages
      .slice(-10)
      .map(m => ({
        role: m.direction === 'incoming' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

    console.log('Calling AI for response...');
    const aiResponse = await chatWithAI(chatHistory);
    console.log('AI Response:', aiResponse.substring(0, 100));

    // Agregar mensaje saliente
    conversation.messages.push({
      id: `msg-${Date.now()}-reply`,
      content: aiResponse,
      direction: 'outgoing',
      messageType: 'text',
      isFromBot: true,
      createdAt: new Date().toISOString(),
    });
    conversation.lastMessage = aiResponse.substring(0, 200);
    conversation.lastMessageAt = new Date().toISOString();
    conversation.lastMessageDir = 'outgoing';

    // Actualizar lead score
    const intent = analyzeLeadIntent(content);
    if (intent.interest === 'high' && conversation.leadStatus === 'new') {
      conversation.leadStatus = 'interested';
    }
    
    const allMessages = conversation.messages.map(m => m.content);
    conversation.leadScore = calculateLeadScore(allMessages, conversation.leadScore);

    // Guardar conversación actualizada
    const convIndex = conversations.findIndex(c => c.id === conversation!.id);
    if (convIndex >= 0) {
      conversations[convIndex] = conversation;
    }
    writeJsonFile(CONVERSATIONS_FILE, conversations);

    // Enviar respuesta por Telegram API
    if (connection.botToken) {
      console.log('Sending reply to Telegram...');
      const sendResponse = await fetch(
        `https://api.telegram.org/bot${connection.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: aiResponse,
          }),
        }
      );
      console.log('Telegram send result:', sendResponse.status);
    }

    return NextResponse.json({ success: true, status: 'processed' });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET - Para verificar que el webhook está activo
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const setup = searchParams.get('setup');
  
  if (setup === 'true') {
    // Retornar información de configuración
    const host = request.headers.get('host') || 'tu-dominio';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const webhookUrl = `${protocol}://${host}/api/webhook/telegram`;
    
    return NextResponse.json({
      message: 'Webhook de Telegram activo',
      webhookUrl,
      setupInstructions: {
        step1: 'Obtén tu bot token de @BotFather en Telegram',
        step2: 'Configura el webhook con este comando:',
        command: `curl "https://api.telegram.org/bot<TU_BOT_TOKEN>/setWebhook?url=${webhookUrl}"`,
        example: `curl "https://api.telegram.org/bot8616959739:AAE0bb4-O7Xfuc41Yi3vs9Dq2hCFUkmOYx0/setWebhook?url=${webhookUrl}"`,
      },
    });
  }
  
  return NextResponse.json({ status: 'Telegram webhook endpoint active', method: 'Use POST for messages' });
}
