import { NextResponse } from 'next/server';

import { readJsonFile } from '@/lib/app-data';

const API_KEYS_FILE = 'api-keys.json';

export async function GET() {
  try {
    const keys = readJsonFile<{ isActive: boolean; model?: string }[]>(API_KEYS_FILE, []);
    const activeKey = keys.find((k) => k.isActive);

    return NextResponse.json({
      success: true,
      data: {
        hasApiKey: !!activeKey,
        activeModel: activeKey?.model || null,
      },
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}
