import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener lead por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener lead' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const lead = await db.lead.update({
      where: { id },
      data: body,
    });

    // Si se actualiza el score, también actualizar la conversación
    if (body.score !== undefined) {
      await db.conversation.update({
        where: { id: lead.conversationId },
        data: { leadScore: body.score },
      });
    }

    return NextResponse.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar lead' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.lead.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Lead eliminado',
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar lead' },
      { status: 500 }
    );
  }
}
