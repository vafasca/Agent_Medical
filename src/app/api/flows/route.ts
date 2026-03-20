import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Listar flujos
export async function GET() {
  try {
    const flows = await db.flow.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      data: flows.map(f => ({
        ...f,
        nodes: f.nodes ? JSON.parse(f.nodes) : [],
        edges: f.edges ? JSON.parse(f.edges) : [],
        triggerConfig: f.triggerConfig ? JSON.parse(f.triggerConfig) : {},
      })),
    });
  } catch (error) {
    console.error('Error fetching flows:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener flujos' },
      { status: 500 }
    );
  }
}

// POST - Crear flujo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, triggerType, triggerConfig, nodes, edges } = body;

    if (!name || !triggerType) {
      return NextResponse.json(
        { success: false, error: 'name y triggerType son requeridos' },
        { status: 400 }
      );
    }

    const flow = await db.flow.create({
      data: {
        name,
        description,
        triggerType,
        triggerConfig: triggerConfig ? JSON.stringify(triggerConfig) : undefined,
        nodes: nodes ? JSON.stringify(nodes) : '[]',
        edges: edges ? JSON.stringify(edges) : '[]',
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: flow,
    });
  } catch (error) {
    console.error('Error creating flow:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear flujo' },
      { status: 500 }
    );
  }
}
