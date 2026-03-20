import { NextRequest, NextResponse } from 'next/server';

import { readJsonFile, writeJsonFile } from '@/lib/app-data';

const API_KEYS_FILE = 'api-keys.json';

interface ApiKey {
  id: string;
  name: string;
  provider: 'groq' | 'openai' | 'openrouter' | 'other';
  apiKey: string;
  baseUrl: string;
  model: string;
  isActive: boolean;
  createdAt: string;
}

interface Model {
  id: string;
  name: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
}

const OPENROUTER_FREE_MODELS: Model[] = [
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)', context_length: 131072 },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (Free)', context_length: 131072 },
  { id: 'meta-llama/llama-3.2-1b-instruct:free', name: 'Llama 3.2 1B (Free)', context_length: 131072 },
  { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', context_length: 8192 },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', context_length: 32768 },
  { id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B (Free)', context_length: 32768 },
  { id: 'huggingfaceh4/zephyr-7b-beta:free', name: 'Zephyr 7B (Free)', context_length: 4096 },
  { id: 'openchat/openchat-7b:free', name: 'OpenChat 7B (Free)', context_length: 8192 },
  { id: 'undi95/toppy-m-7b:free', name: 'Toppy M 7B (Free)', context_length: 4096 },
  { id: 'gryphe/mythomist-7b:free', name: 'MythoMist 7B (Free)', context_length: 32768 },
];

const GROQ_FREE_MODELS: Model[] = [
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', context_length: 131072 },
  { id: 'llama-3.2-1b-preview', name: 'Llama 3.2 1B Preview', context_length: 8192 },
  { id: 'llama-3.2-3b-preview', name: 'Llama 3.2 3B Preview', context_length: 8192 },
  { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B Vision', context_length: 8192 },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', context_length: 8192 },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', context_length: 32768 },
];

function getApiKeys(): ApiKey[] {
  return readJsonFile<ApiKey[]>(API_KEYS_FILE, []);
}

function saveApiKeys(keys: ApiKey[]) {
  writeJsonFile(API_KEYS_FILE, keys);
}

function detectProvider(apiKey: string): { provider: ApiKey['provider']; baseUrl: string } {
  if (apiKey.startsWith('sk-or-')) {
    return { provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1' };
  }
  if (apiKey.startsWith('gsk_')) {
    return { provider: 'groq', baseUrl: 'https://api.groq.com/openai/v1' };
  }
  if (apiKey.startsWith('sk-')) {
    return { provider: 'openai', baseUrl: 'https://api.openai.com/v1' };
  }
  return { provider: 'other', baseUrl: 'https://api.groq.com/openai/v1' };
}

async function verifyApiKey(apiKey: string, provider: string): Promise<{ valid: boolean; models?: Model[]; error?: string }> {
  try {
    let url: string;
    let headers: Record<string, string>;

    if (provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/models';
      headers = {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://agentmedical.app',
        'X-Title': 'Agent Medical',
      };
    } else if (provider === 'groq') {
      url = 'https://api.groq.com/openai/v1/models';
      headers = { Authorization: `Bearer ${apiKey}` };
    } else {
      url = 'https://api.openai.com/v1/models';
      headers = { Authorization: `Bearer ${apiKey}` };
    }

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'API key inválida o sin permisos' };
      }
      return { valid: false, error: `Error ${response.status}: ${errorText}` };
    }

    const data = await response.json();

    if (provider === 'openrouter') {
      const allModels = data.data || [];
      const freeModels = allModels
        .filter((m: { id: string; pricing?: { prompt?: string; completion?: string } }) =>
          m.id?.includes(':free') || m.pricing?.prompt === '0' || m.pricing?.prompt === 0
        )
        .map((m: { id: string; name?: string; context_length?: number }) => ({
          id: m.id,
          name: m.name || m.id,
          context_length: m.context_length,
        }));

      return { valid: true, models: freeModels.length > 0 ? freeModels : OPENROUTER_FREE_MODELS };
    }

    if (provider === 'groq') {
      const apiModels = (data.data || []).map((m: { id: string; owned_by?: string }) => ({
        id: m.id,
        name: m.id,
      }));

      return { valid: true, models: apiModels.length > 0 ? apiModels : GROQ_FREE_MODELS };
    }

    return {
      valid: true,
      models: (data.data || []).map((m: { id: string }) => ({ id: m.id, name: m.id })),
    };
  } catch (error) {
    console.error('Error verificando API key:', error);
    return { valid: false, error: 'Error de conexión al verificar la API key' };
  }
}

export async function GET() {
  try {
    const keys = getApiKeys();
    const masked = keys.map((k) => ({
      ...k,
      url: k.baseUrl,
      apiKey: `${k.apiKey.substring(0, 8)}...${k.apiKey.substring(k.apiKey.length - 4)}`,
    }));

    return NextResponse.json({
      success: true,
      keys: masked,
      providers: {
        openrouter: {
          name: 'OpenRouter',
          description: 'Múltiples modelos gratuitos',
          keyPrefix: 'sk-or-',
          freeModels: OPENROUTER_FREE_MODELS,
          getUrl: 'https://openrouter.ai/keys',
        },
        groq: {
          name: 'Groq',
          description: 'Llama, Mixtral, Gemma gratis',
          keyPrefix: 'gsk_',
          freeModels: GROQ_FREE_MODELS,
          getUrl: 'https://console.groq.com/keys',
        },
      },
    });
  } catch (error) {
    console.error('Error en GET /api/groq-keys:', error);
    return NextResponse.json({ success: true, keys: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { name, apiKey, baseUrl, model, provider: inputProvider } = body;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API Key requerida' }, { status: 400 });
    }

    apiKey = String(apiKey).trim().replace(/\s/g, '');

    const detected = detectProvider(apiKey);
    const provider = inputProvider || detected.provider;
    const finalBaseUrl = baseUrl || detected.baseUrl;
    const verification = await verifyApiKey(apiKey, provider);

    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: verification.error || 'API key inválida' },
        { status: 400 }
      );
    }

    const defaultModels: Record<string, string> = {
      openrouter: 'meta-llama/llama-3.1-8b-instruct:free',
      groq: verification.models?.[0]?.id || 'llama-3.1-8b-instant',
      openai: 'gpt-4o-mini',
    };

    if (!model) {
      model = defaultModels[provider] || 'llama-3.1-8b-instant';
    }

    const keys = getApiKeys().map((key) => ({ ...key, isActive: false }));

    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: name || `${provider.toUpperCase()} API`,
      provider: provider as ApiKey['provider'],
      apiKey,
      baseUrl: finalBaseUrl,
      model,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    keys.push(newKey);
    saveApiKeys(keys);

    return NextResponse.json({
      success: true,
      key: {
        ...newKey,
        url: newKey.baseUrl,
        apiKey: `${newKey.apiKey.substring(0, 8)}...${newKey.apiKey.substring(newKey.apiKey.length - 4)}`,
      },
      provider,
      availableModels: verification.models || [],
    });
  } catch (error) {
    console.error('Error en POST /api/groq-keys:', error);
    return NextResponse.json(
      { success: false, error: `Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { keyId } = await request.json();
    saveApiKeys(getApiKeys().filter((k) => k.id !== keyId));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Error al eliminar' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { keyId, model, isActive, name, baseUrl } = await request.json();
    const keys = getApiKeys();

    if (isActive !== undefined) {
      keys.forEach((k) => {
        k.isActive = k.id === keyId;
      });
    }

    const keyIndex = keys.findIndex((k) => k.id === keyId);
    if (keyIndex >= 0) {
      if (model) keys[keyIndex].model = model;
      if (name) keys[keyIndex].name = name;
      if (baseUrl) keys[keyIndex].baseUrl = baseUrl;
    }

    saveApiKeys(keys);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Error al actualizar' }, { status: 500 });
  }
}
