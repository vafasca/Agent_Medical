import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Listar conversaciones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const leadStatus = searchParams.get('leadStatus');
    const platform = searchParams.get('platform');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (leadStatus) where.leadStatus = leadStatus;
    if (platform) where.platform = platform;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { username: { contains: search } },
        { lastMessage: { contains: search } },
      ];
    }

    const [conversations, total] = await Promise.all([
      db.conversation.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          lead: true,
        },
        orderBy: { lastMessageAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.conversation.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: conversations,
      meta: { total, limit, offset },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener conversaciones' },
      { status: 500 }
    );
  }
}

// POST - Crear conversación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      externalId,
      name,
      phone,
      username,
      platform,
      platformUserId,
      socialConnectionId,
    } = body;

    if (!externalId || !platform) {
      return NextResponse.json(
        { success: false, error: 'externalId y platform son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const existing = await db.conversation.findUnique({
      where: { externalId },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing,
        message: 'Conversación ya existe',
      });
    }

    const conversation = await db.conversation.create({
      data: {
        externalId,
        name,
        phone,
        username,
        platform,
        platformUserId,
        socialConnectionId,
      },
    });

    // Crear lead asociado
    await db.lead.create({
      data: {
        conversationId: conversation.id,
        name,
        phone,
        source: platform,
      },
    });

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear conversación' },
      { status: 500 }
    );
  }
}
