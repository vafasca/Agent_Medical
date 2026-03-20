import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener conexión por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const connection = await db.socialConnection.findUnique({
      where: { id },
    });

    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Conexión no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: connection,
    });
  } catch (error) {
    console.error('Error fetching connection:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener conexión' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar conexión
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const connection = await db.socialConnection.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({
      success: true,
      data: connection,
    });
  } catch (error) {
    console.error('Error updating connection:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar conexión' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar conexión
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.socialConnection.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Conexión eliminada',
    });
  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar conexión' },
      { status: 500 }
    );
  }
}
