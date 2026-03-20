import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { readJsonFile } from '@/lib/app-data';

const API_KEYS_FILE = 'api-keys.json';

interface ApiKey {
  id: string;
  name: string;
  provider: 'groq' | 'openai' | 'openrouter' | 'other';
  apiKey: string;
  baseUrl: string;
  model: string;
  isActive: boolean;
}

function getActiveApiKey(): ApiKey | null {
  const keys = readJsonFile<ApiKey[]>(API_KEYS_FILE, []);
  return keys.find((k) => k.isActive) || keys[0] || null;
}

function resolveProviderRequest(apiKeyConfig: ApiKey) {
  if (apiKeyConfig.provider === 'openrouter') {
    return {
      url: 'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKeyConfig.apiKey}`,
        'HTTP-Referer': 'https://agentmedical.app',
        'X-Title': 'Agent Medical',
      },
    };
  }

  if (apiKeyConfig.provider === 'groq') {
    return {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKeyConfig.apiKey}`,
      },
    };
  }

  if (apiKeyConfig.provider === 'openai') {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKeyConfig.apiKey}`,
      },
    };
  }

  return {
    url: `${apiKeyConfig.baseUrl.replace(/\/$/, '')}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKeyConfig.apiKey}`,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ success: false, error: 'Mensaje requerido' }, { status: 400 });
    }

    const apiKeyConfig = getActiveApiKey();
    if (!apiKeyConfig) {
      return NextResponse.json(
        { success: false, error: 'No hay API key configurada. Ve a Configuración para agregar una.' },
        { status: 400 }
      );
    }

    const knowledge = await db.knowledgeBase.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: 10,
    });

    const knowledgeContext = knowledge
      .map((k) => `## ${k.title}\n${k.content}`)
      .join('\n\n');

    const messages = [
      {
        role: 'system',
        content: `Eres un asistente virtual profesional especializado en la venta de cursos médicos.\n\n## Información sobre los cursos:\n${knowledgeContext || 'Responde de manera útil y profesional a preguntas sobre cursos médicos.'}\n\n## Instrucciones:\n- Responde de manera concisa pero completa\n- Si el usuario muestra interés, pregunta si desea más información`,
      },
      ...history,
      { role: 'user', content: message },
    ];

    const { url, headers } = resolveProviderRequest(apiKeyConfig);
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: apiKeyConfig.model,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, error: `Error de API (${response.status}): ${errorText}` },
        { status: 400 }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      response: data.choices?.[0]?.message?.content || 'No pude generar una respuesta.',
      model: apiKeyConfig.model,
      provider: apiKeyConfig.provider,
    });
  } catch (error) {
    console.error('Error en chat:', error);
    return NextResponse.json(
      { success: false, error: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}` },
      { status: 500 }
    );
  }
}
