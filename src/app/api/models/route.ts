import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Listar modelos disponibles
export async function GET() {
  try {
    const models = await db.aIModel.findMany({
      orderBy: [{ isAvailable: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: models,
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener modelos' },
      { status: 500 }
    );
  }
}

// POST - Seleccionar modelo activo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId } = body;

    if (!modelId) {
      return NextResponse.json(
        { success: false, error: 'ID del modelo es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el modelo existe y está disponible
    const model = await db.aIModel.findUnique({
      where: { modelId },
    });

    if (!model || !model.isAvailable) {
      return NextResponse.json(
        { success: false, error: 'Modelo no disponible' },
        { status: 400 }
      );
    }

    // Desactivar todos los modelos
    await db.aIModel.updateMany({
      data: { isActive: false },
    });

    // Activar el modelo seleccionado
    await db.aIModel.update({
      where: { modelId },
      data: { isActive: true },
    });

    return NextResponse.json({
      success: true,
      message: `Modelo ${model.name} activado`,
    });
  } catch (error) {
    console.error('Error activating model:', error);
    return NextResponse.json(
      { success: false, error: 'Error al activar modelo' },
      { status: 500 }
    );
  }
}
