import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Listar leads
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const minScore = searchParams.get('minScore');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};

    if (stage) where.stage = stage;
    if (minScore) where.score = { gte: parseInt(minScore) };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { interest: { contains: search } },
      ];
    }

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        include: {
          conversation: {
            select: {
              id: true,
              platform: true,
              lastMessage: true,
              lastMessageAt: true,
              leadStatus: true,
            },
          },
        },
        orderBy: { score: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.lead.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: leads,
      meta: { total, limit, offset },
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener leads' },
      { status: 500 }
    );
  }
}

// POST - Crear lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversationId,
      name,
      email,
      phone,
      interest,
      score,
      stage,
      source,
      notes,
      tags,
    } = body;

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'conversationId es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la conversación existe
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si ya existe lead para esta conversación
    const existingLead = await db.lead.findUnique({
      where: { conversationId },
    });

    if (existingLead) {
      return NextResponse.json({
        success: true,
        data: existingLead,
        message: 'Lead ya existe para esta conversación',
      });
    }

    const lead = await db.lead.create({
      data: {
        conversationId,
        name,
        email,
        phone,
        interest,
        score: score || 0,
        stage: stage || 'awareness',
        source,
        notes,
        tags: tags ? JSON.stringify(tags) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear lead' },
      { status: 500 }
    );
  }
}
