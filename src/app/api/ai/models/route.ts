import { NextRequest, NextResponse } from 'next/server';

// Modelos disponibles (actualizado)
const AVAILABLE_MODELS = [
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)', provider: 'openrouter' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (Free)', provider: 'openrouter' },
  { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', provider: 'openrouter' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', provider: 'openrouter' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'groq' },
  { id: 'llama-3.2-1b-preview', name: 'Llama 3.2 1B', provider: 'groq' },
  { id: 'llama-3.2-3b-preview', name: 'Llama 3.2 3B', provider: 'groq' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', provider: 'groq' },
];

// GET - Listar modelos disponibles
export async function GET() {
  return NextResponse.json({
    success: true,
    models: AVAILABLE_MODELS,
  });
}
