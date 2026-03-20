import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const PLATFORMS = ['whatsapp', 'facebook', 'instagram', 'telegram', 'tiktok'];

// GET - Listar conexiones de redes sociales
export async function GET() {
  try {
    const connections = await db.socialConnection.findMany({
      orderBy: [{ isActive: 'desc' }, { platform: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: connections,
    });
  } catch (error) {
    console.error('Error fetching social connections:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener conexiones' },
      { status: 500 }
    );
  }
}

// POST - Crear conexión de red social
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      platform,
      name,
      accessToken,
      apiKey,
      apiSecret,
      phoneNumber,
      phoneNumberId,
      pageId,
      botToken,
      config,
    } = body;

    if (!platform || !PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { success: false, error: 'Plataforma inválida' },
        { status: 400 }
      );
    }

    // Generar verify token si no existe
    const verifyToken = Math.random().toString(36).substring(2, 15);

    // Generar webhook URL
    const webhookUrl = `/api/webhook/${platform}`;

    const connection = await db.socialConnection.create({
      data: {
        platform,
        name: name || platform.charAt(0).toUpperCase() + platform.slice(1),
        accessToken,
        apiKey,
        apiSecret,
        phoneNumber,
        phoneNumberId,
        pageId,
        botToken,
        verifyToken,
        webhookUrl,
        config: config ? JSON.stringify(config) : undefined,
        isActive: false, // Inactivo por defecto hasta verificar
      },
    });

    return NextResponse.json({
      success: true,
      data: connection,
      message: 'Conexión creada. Configura el webhook para activar.',
    });
  } catch (error) {
    console.error('Error creating social connection:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear conexión' },
      { status: 500 }
    );
  }
}
