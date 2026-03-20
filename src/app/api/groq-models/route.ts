import { NextRequest, NextResponse } from 'next/server';

// GET - Obtener modelos disponibles de Groq
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get('apiKey');

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'API Key requerida' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'API Key inválida' },
        { status: 400 }
      );
    }

    const data = await response.json();
    const models = (data.data || []).map((m: { id: string; created?: number }) => ({
      id: m.id,
      name: formatModelName(m.id),
    }));

    // Modelos populares ordenados
    const popularOrder = [
      'llama-3.3-70b-versatile',
      'llama-3.3-70b-specdec',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.2-1b-preview',
      'llama-3.2-3b-preview',
      'llama-3.2-11b-vision-preview',
      'llama-3.2-90b-vision-preview',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'deepseek-r1-distill-llama-70b',
    ];

    models.sort((a: { id: string }, b: { id: string }) => {
      const aIndex = popularOrder.indexOf(a.id);
      const bIndex = popularOrder.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) return a.id.localeCompare(b.id);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return NextResponse.json({
      success: true,
      models,
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener modelos' },
      { status: 500 }
    );
  }
}

function formatModelName(id: string): string {
  const names: Record<string, string> = {
    'llama-3.3-70b-versatile': 'Llama 3.3 70B Versatile (Recomendado)',
    'llama-3.3-70b-specdec': 'Llama 3.3 70B SpecDec (Rápido)',
    'llama-3.1-70b-versatile': 'Llama 3.1 70B Versatile',
    'llama-3.1-8b-instant': 'Llama 3.1 8B Instant (Más rápido)',
    'llama-3.2-1b-preview': 'Llama 3.2 1B Preview',
    'llama-3.2-3b-preview': 'Llama 3.2 3B Preview',
    'llama-3.2-11b-vision-preview': 'Llama 3.2 11B Vision',
    'llama-3.2-90b-vision-preview': 'Llama 3.2 90B Vision',
    'mixtral-8x7b-32768': 'Mixtral 8x7B',
    'gemma2-9b-it': 'Gemma 2 9B IT',
    'deepseek-r1-distill-llama-70b': 'DeepSeek R1 Distill Llama 70B',
  };

  return names[id] || id;
}
