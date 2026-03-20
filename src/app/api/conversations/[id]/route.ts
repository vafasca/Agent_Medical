import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener conversación por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        lead: true,
        socialConnection: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    // Marcar como leído
    await db.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener conversación' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar conversación
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const conversation = await db.conversation.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar conversación' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar conversación
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.conversation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Conversación eliminada',
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar conversación' },
      { status: 500 }
    );
  }
}
