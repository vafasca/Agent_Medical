import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener flujo por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const flow = await db.flow.findUnique({
      where: { id },
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!flow) {
      return NextResponse.json(
        { success: false, error: 'Flujo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...flow,
        nodes: flow.nodes ? JSON.parse(flow.nodes) : [],
        edges: flow.edges ? JSON.parse(flow.edges) : [],
        triggerConfig: flow.triggerConfig ? JSON.parse(flow.triggerConfig) : {},
        executions: flow.executions.map(e => ({
          ...e,
          input: e.input ? JSON.parse(e.input) : {},
          output: e.output ? JSON.parse(e.output) : {},
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching flow:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener flujo' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar flujo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = { ...body };

    if (body.nodes) updateData.nodes = JSON.stringify(body.nodes);
    if (body.edges) updateData.edges = JSON.stringify(body.edges);
    if (body.triggerConfig) updateData.triggerConfig = JSON.stringify(body.triggerConfig);

    const flow = await db.flow.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: flow,
    });
  } catch (error) {
    console.error('Error updating flow:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar flujo' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar flujo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.flow.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Flujo eliminado',
    });
  } catch (error) {
    console.error('Error deleting flow:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar flujo' },
      { status: 500 }
    );
  }
}
