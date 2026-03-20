import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = '/home/z/my-project/data';
const API_KEYS_FILE = path.join(DATA_DIR, 'api-keys.json');
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'knowledge.json');

interface ApiKey {
  id: string;
  name: string;
  provider: 'groq' | 'openai' | 'openrouter' | 'other';
  apiKey: string;
  baseUrl: string;
  model: string;
  isActive: boolean;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: number;
  isActive: boolean;
}

function getActiveApiKey(): ApiKey | null {
  try {
    if (!fs.existsSync(API_KEYS_FILE)) return null;
    const keys: ApiKey[] = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf-8'));
    return keys.find((k) => k.isActive) || keys[0] || null;
  } catch {
    return null;
  }
}

function getKnowledge(): KnowledgeItem[] {
  try {
    if (!fs.existsSync(KNOWLEDGE_FILE)) return [];
    return JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  console.log('=== POST /api/chat ===');
  
  try {
    const { message, history = [] } = await request.json();

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Mensaje requerido' },
        { status: 400 }
      );
    }

    const apiKeyConfig = getActiveApiKey();
    console.log('API Key config:', apiKeyConfig ? { 
      provider: apiKeyConfig.provider, 
      model: apiKeyConfig.model, 
      baseUrl: apiKeyConfig.baseUrl,
      keyPrefix: apiKeyConfig.apiKey.substring(0, 10) + '...'
    } : 'No API key found');

    if (!apiKeyConfig) {
      return NextResponse.json(
        { success: false, error: 'No hay API key configurada. Ve a Configuración para agregar una.' },
        { status: 400 }
      );
    }

    // Obtener base de conocimiento
    const knowledge = getKnowledge();
    const activeKnowledge = knowledge
      .filter((k) => k.isActive)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);

    const knowledgeContext = activeKnowledge
      .map((k) => `## ${k.title}\n${k.content}`)
      .join('\n\n');

    // System prompt
    const systemPrompt = `Eres un asistente virtual profesional especializado en la venta de cursos médicos.

## Información sobre los cursos:
${knowledgeContext || 'Responde de manera útil y profesional a preguntas sobre cursos médicos.'}

## Instrucciones:
- Responde de manera concisa pero completa
- Si el usuario muestra interés, pregunta si desea más información`;

    // Construir mensajes
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ];

    // Construir URL y headers según el proveedor
    let url: string;
    let headers: Record<string, string>;
    
    if (apiKeyConfig.provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyConfig.apiKey}`,
        'HTTP-Referer': 'https://salesbot-ai.local',
        'X-Title': 'SalesBot AI',
      };
    } else if (apiKeyConfig.provider === 'groq') {
      url = 'https://api.groq.com/openai/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyConfig.apiKey}`,
      };
    } else if (apiKeyConfig.provider === 'openai') {
      url = 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyConfig.apiKey}`,
      };
    } else {
      // Usar baseUrl personalizado
      url = `${apiKeyConfig.baseUrl}/chat/completions`;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyConfig.apiKey}`,
      };
    }
    
    console.log('Proveedor:', apiKeyConfig.provider);
    console.log('URL:', url);
    console.log('Modelo:', apiKeyConfig.model);
    console.log('Messages count:', messages.length);

    // Llamar a la API
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: apiKeyConfig.model,
        messages: messages,
      }),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de API:', response.status, errorText);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Error de API (${response.status}): ${errorText}` 
        },
        { status: 400 }
      );
    }

    const data = await response.json();
    console.log('Respuesta recibida:', data.choices?.[0]?.message?.content?.substring(0, 100));
    
    const reply = data.choices?.[0]?.message?.content || 'No pude generar una respuesta.';

    return NextResponse.json({
      success: true,
      response: reply,
      model: apiKeyConfig.model,
      provider: apiKeyConfig.provider,
    });
  } catch (error) {
    console.error('Error en chat:', error);
    return NextResponse.json(
      { success: false, error: 'Error: ' + (error instanceof Error ? error.message : 'Error desconocido') },
      { status: 500 }
    );
  }
}
