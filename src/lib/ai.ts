import { db } from '@/lib/db';
import { readJsonFile } from '@/lib/app-data';

const API_KEYS_FILE = 'api-keys.json';

// Modelos gratuitos disponibles
export const GROQ_MODELS = [
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'groq' },
  { id: 'llama-3.2-1b-preview', name: 'Llama 3.2 1B Preview', provider: 'groq' },
  { id: 'llama-3.2-3b-preview', name: 'Llama 3.2 3B Preview', provider: 'groq' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', provider: 'groq' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq' },
];

export const OPENROUTER_FREE_MODELS = [
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)', provider: 'openrouter' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (Free)', provider: 'openrouter' },
  { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', provider: 'openrouter' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', provider: 'openrouter' },
];

export function getGroqModels() {
  return [...GROQ_MODELS, ...OPENROUTER_FREE_MODELS];
}

interface ApiKeyConfig {
  id: string;
  name: string;
  provider: 'groq' | 'openai' | 'openrouter' | 'other';
  apiKey: string;
  baseUrl: string;
  model: string;
  isActive: boolean;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function getActiveApiKey(): ApiKeyConfig | null {
  const keys = readJsonFile<ApiKeyConfig[]>(API_KEYS_FILE, []);
  return keys.find((k) => k.isActive) || keys[0] || null;
}

export function hasActiveGroqKey(): boolean {
  return getActiveApiKey() !== null;
}

export function getActiveModel(): string {
  const key = getActiveApiKey();
  return key?.model || 'llama-3.1-8b-instant';
}

function resolveProviderRequest(config: ApiKeyConfig) {
  if (config.provider === 'openrouter') {
    return {
      url: 'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'HTTP-Referer': 'https://agentmedical.app',
        'X-Title': 'Agent Medical',
      },
    };
  }

  if (config.provider === 'groq') {
    return {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
    };
  }

  if (config.provider === 'openai') {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
    };
  }

  return {
    url: `${config.baseUrl.replace(/\/$/, '')}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
  };
}

export async function chatWithGroq(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  const apiKeyConfig = getActiveApiKey();

  if (!apiKeyConfig) {
    throw new Error('No hay API key configurada. Ve a Configuración para agregar una.');
  }

  const knowledge = await getKnowledgeContext();
  const systemMessage: ChatMessage = {
    role: 'system',
    content: systemPrompt || getDefaultSystemPrompt(knowledge),
  };

  const { url, headers } = resolveProviderRequest(apiKeyConfig);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: apiKeyConfig.model,
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Error en la API de IA');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function getKnowledgeContext(): Promise<string> {
  try {
    const knowledge = await db.knowledgeBase.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: 20,
    });

    if (knowledge.length === 0) {
      return '';
    }

    return knowledge
      .map((item) => `## ${item.title}\n${item.content}`)
      .join('\n\n');
  } catch {
    return '';
  }
}

function getDefaultSystemPrompt(knowledge?: string): string {
  return `Eres un asistente virtual profesional especializado en la venta de cursos médicos de alta calidad. Tu objetivo es ayudar a profesionales de la salud a encontrar el curso perfecto para su desarrollo profesional.

## Tu personalidad:
- Amable, profesional y empático
- Conocedor del sector médico y educativo
- Orientado a ayudar y resolver dudas
- No agresivo en ventas, pero persuasivo de manera sutil

## Tus objetivos:
1. Identificar las necesidades del profesional médico
2. Presentar los cursos más adecuados
3. Resolver dudas sobre precios, horarios, certificaciones
4. Captar leads interesados para seguimiento

## Información importante sobre los cursos:
${knowledge || 'Usa la información proporcionada para responder preguntas sobre cursos, precios, horarios y certificaciones.'}

## Instrucciones:
- Responde de manera concisa pero completa
- Si no tienes información específica, indícalo amablemente
- Ofrece alternativas cuando sea posible
- Si el usuario muestra interés, pregunta si desea más información o ser contactado
- Detecta el nivel de interés y clasifica al lead (bajo, medio, alto)
- Nunca inventes información sobre cursos o precios`;
}

export function analyzeLeadIntent(message: string): {
  interest: 'low' | 'medium' | 'high';
  topics: string[];
  intent: string;
} {
  const lowerMessage = message.toLowerCase();

  const highIntentKeywords = [
    'comprar', 'inscribir', 'registrarme', 'precio', 'costo',
    'cuánto cuesta', 'pagar', 'matricular', 'fechas', 'cuándo empieza',
    'certificado', 'descuento', 'promoción', 'disponible', 'quiero el curso',
    'necesito', 'urgente', 'ya', 'hoy', 'mañana'
  ];

  const mediumIntentKeywords = [
    'información', 'detalles', 'temario', 'duración', 'horario',
    'requisitos', 'para quién', 'beneficios', 'incluye', 'modalidad',
    'dónde', 'cómo', 'cuál'
  ];

  const medicalTopics = [
    'cardiología', 'neurología', 'pediatría', 'ginecología', 'traumatología',
    'dermatología', 'oncología', 'psiquiatría', 'medicina', 'cirugía',
    'enfermería', 'nutrición', 'fisioterapia', 'odontología', 'urgencias',
    'ecografía', 'ultrasonido', 'rayos x', 'laboratorio', 'farmacología',
    'curso', 'diplomado', 'maestría', 'especialización', 'certificación'
  ];

  let interest: 'low' | 'medium' | 'high' = 'low';
  const topics: string[] = [];
  let intent = 'exploration';

  if (highIntentKeywords.some(kw => lowerMessage.includes(kw))) {
    interest = 'high';
    intent = 'purchase_intent';
  } else if (mediumIntentKeywords.some(kw => lowerMessage.includes(kw))) {
    interest = 'medium';
    intent = 'information_seeking';
  }

  medicalTopics.forEach(topic => {
    if (lowerMessage.includes(topic)) {
      topics.push(topic);
    }
  });

  return { interest, topics, intent };
}

export function calculateLeadScore(
  messages: string[],
  currentScore: number = 0
): number {
  let score = currentScore;

  messages.forEach(msg => {
    const analysis = analyzeLeadIntent(msg);

    if (analysis.interest === 'high') {
      score += 20;
    } else if (analysis.interest === 'medium') {
      score += 10;
    } else {
      score += 2;
    }

    score += analysis.topics.length * 5;
  });

  return Math.min(score, 100);
}
