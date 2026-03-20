import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

export async function GET() {
  try {
    const activeKey = await db.apiKey.findFirst({ where: { isActive: true } });

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
