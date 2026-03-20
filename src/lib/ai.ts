import fs from 'fs';
import path from 'path';

const DATA_DIR = '/home/z/my-project/data';
const GROQ_KEYS_FILE = path.join(DATA_DIR, 'groq-keys.json');

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

interface GroqKey {
  id: string;
  name: string;
  apiKey: string;
  url: string;
  model: string;
  isActive: boolean;
  createdAt: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function getActiveGroqKey(): GroqKey | null {
  try {
    if (!fs.existsSync(GROQ_KEYS_FILE)) return null;
    const keys: GroqKey[] = JSON.parse(fs.readFileSync(GROQ_KEYS_FILE, 'utf-8'));
    return keys.find((k) => k.isActive) || keys[0] || null;
  } catch {
    return null;
  }
}

export function hasActiveGroqKey(): boolean {
  return getActiveGroqKey() !== null;
}

export function getActiveModel(): string {
  const key = getActiveGroqKey();
  return key?.model || 'llama-3.3-70b-versatile';
}

export async function chatWithGroq(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  const groqKey = getActiveGroqKey();

  if (!groqKey) {
    throw new Error('No hay API key de Groq configurada. Ve a Configuración para agregar una.');
  }

  // Obtener base de conocimiento
  const knowledge = await getKnowledgeContext();

  const systemMessage: ChatMessage = {
    role: 'system',
    content: systemPrompt || getDefaultSystemPrompt(knowledge),
  };

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey.apiKey}`,
    },
    body: JSON.stringify({
      model: groqKey.model,
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Error en la API de Groq');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function getKnowledgeContext(): Promise<string> {
  const KNOWLEDGE_FILE = path.join(DATA_DIR, 'knowledge.json');

  try {
    if (!fs.existsSync(KNOWLEDGE_FILE)) return '';
    const knowledge = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf-8'));
    const activeKnowledge = knowledge.filter((k: { isActive: boolean }) => k.isActive);

    if (activeKnowledge.length === 0) return '';

    return activeKnowledge
      .sort((a: { priority: number }, b: { priority: number }) => b.priority - a.priority)
      .slice(0, 20)
      .map((k: { title: string; content: string }) => `## ${k.title}\n${k.content}`)
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

  // Palabras clave de alto interés
  const highIntentKeywords = [
    'comprar', 'inscribir', 'registrarme', 'precio', 'costo',
    'cuánto cuesta', 'pagar', 'matricular', 'fechas', 'cuándo empieza',
    'certificado', 'descuento', 'promoción', 'disponible', 'quiero el curso',
    'necesito', 'urgente', 'ya', 'hoy', 'mañana'
  ];

  // Palabras clave de medio interés
  const mediumIntentKeywords = [
    'información', 'detalles', 'temario', 'duración', 'horario',
    'requisitos', 'para quién', 'beneficios', 'incluye', 'modalidad',
    'dónde', 'cómo', 'cuál'
  ];

  // Tópicos médicos
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

  // Detectar nivel de interés
  if (highIntentKeywords.some(kw => lowerMessage.includes(kw))) {
    interest = 'high';
    intent = 'purchase_intent';
  } else if (mediumIntentKeywords.some(kw => lowerMessage.includes(kw))) {
    interest = 'medium';
    intent = 'information_seeking';
  }

  // Detectar tópicos
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

    // Bonus por tópicos específicos
    score += analysis.topics.length * 5;
  });

  // Cap máximo score
  return Math.min(score, 100);
}
