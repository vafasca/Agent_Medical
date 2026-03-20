import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

const PLATFORMS = ['whatsapp', 'facebook', 'instagram', 'telegram', 'tiktok'];

export async function GET() {
  try {
    const connections = await db.socialConnection.findMany({
      orderBy: [{ isActive: 'desc' }, { platform: 'asc' }],
    });

    return NextResponse.json({ success: true, data: connections });
  } catch (error) {
    console.error('Error fetching social connections:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener conexiones' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      platform,
      name,
      accessToken,
      phoneNumberId,
      botToken,
      verifyToken: inputVerifyToken,
    } = body;

    if (!platform || !PLATFORMS.includes(platform)) {
      return NextResponse.json({ success: false, error: 'Plataforma inválida' }, { status: 400 });
    }

    const verifyToken = inputVerifyToken || Math.random().toString(36).slice(2, 15);
    const webhookUrl = `/api/webhook/${platform}`;

    const connection = await db.socialConnection.create({
      data: {
        platform,
        name: name || platform.charAt(0).toUpperCase() + platform.slice(1),
        accessToken: accessToken || null,
        phoneNumberId: phoneNumberId || null,
        botToken: botToken || null,
        verifyToken,
        webhookUrl,
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: connection,
      message: 'Conexión creada. Actívala después de configurar el webhook oficial.',
    });
  } catch (error) {
    console.error('Error creating social connection:', error);
    return NextResponse.json({ success: false, error: 'Error al crear conexión' }, { status: 500 });
  }
}
