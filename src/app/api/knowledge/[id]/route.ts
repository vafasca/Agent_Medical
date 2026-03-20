import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await db.knowledgeBase.findUnique({ where: { id } });

    if (!item) {
      return NextResponse.json({ success: false, error: 'Artículo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching knowledge:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener artículo' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const item = await db.knowledgeBase.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.priority !== undefined ? { priority: Number(body.priority) } : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('Error updating knowledge:', error);
    return NextResponse.json({ success: false, error: 'Error al actualizar artículo' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.knowledgeBase.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Artículo eliminado' });
  } catch (error) {
    console.error('Error deleting knowledge:', error);
    return NextResponse.json({ success: false, error: 'Error al eliminar artículo' }, { status: 500 });
  }
}
