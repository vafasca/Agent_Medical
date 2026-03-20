import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatWithGroq } from '@/lib/ai';

// POST - Ejecutar flujo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { input } = body;

    const startTime = Date.now();

    // Obtener flujo
    const flow = await db.flow.findUnique({
      where: { id },
    });

    if (!flow) {
      return NextResponse.json(
        { success: false, error: 'Flujo no encontrado' },
        { status: 404 }
      );
    }

    if (!flow.isActive) {
      return NextResponse.json(
        { success: false, error: 'Flujo no está activo' },
        { status: 400 }
      );
    }

    // Crear registro de ejecución
    const execution = await db.flowExecution.create({
      data: {
        flowId: id,
        status: 'running',
        input: input ? JSON.stringify(input) : undefined,
      },
    });

    try {
      const nodes = flow.nodes ? JSON.parse(flow.nodes) : [];
      const edges = flow.edges ? JSON.parse(flow.edges) : [];

      // Ejecutar nodos en orden
      let output: Record<string, unknown> = { ...input };
      const executionLog: unknown[] = [];

      // Encontrar nodo inicial (trigger)
      const triggerNode = nodes.find((n: { type: string }) => n.type === 'trigger');
      if (!triggerNode) {
        throw new Error('No se encontró nodo trigger');
      }

      // Procesar nodos conectados
      let currentNode = triggerNode;
      const visited = new Set<string>();

      while (currentNode && !visited.has(currentNode.id)) {
        visited.add(currentNode.id);

        switch (currentNode.type) {
          case 'ai':
            // Nodo de IA - obtener respuesta
            if (output.message) {
              const response = await chatWithGroq([
                { role: 'user', content: output.message as string },
              ]);
              output.aiResponse = response;
            }
            break;

          case 'message':
            // Nodo de mensaje - enviar mensaje
            if (currentNode.data?.config?.message) {
              output.sentMessage = currentNode.data.config.message;
            }
            break;

          case 'condition':
            // Nodo de condición - evaluar
            const condition = currentNode.data?.config?.condition as string;
            if (condition && output[condition]) {
              // Buscar conexión con esta condición
              const conditionEdge = edges.find(
                (e: { source: string; condition?: string }) =>
                  e.source === currentNode.id && e.condition === condition
              );
              if (conditionEdge) {
                const nextNode = nodes.find(
                  (n: { id: string }) => n.id === conditionEdge.target
                );
                if (nextNode) {
                  currentNode = nextNode;
                  continue;
                }
              }
            }
            break;

          case 'action':
            // Nodo de acción - ejecutar acción
            const action = currentNode.data?.config?.action as string;
            output.actionExecuted = action;
            break;

          case 'delay':
            // Nodo de delay - esperar
            const delayMs = (currentNode.data?.config?.delay as number) || 1000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
            break;
        }

        executionLog.push({
          nodeId: currentNode.id,
          type: currentNode.type,
          output: { ...output },
        });

        // Buscar siguiente nodo
        const nextEdge = edges.find(
          (e: { source: string }) => e.source === currentNode.id
        );
        if (nextEdge) {
          currentNode = nodes.find(
            (n: { id: string }) => n.id === nextEdge.target
          );
        } else {
          currentNode = null;
        }
      }

      // Actualizar ejecución como completada
      const duration = Date.now() - startTime;
      await db.flowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          output: JSON.stringify(output),
          duration,
        },
      });

      // Actualizar contador de ejecuciones del flujo
      await db.flow.update({
        where: { id },
        data: {
          executionCount: { increment: 1 },
          lastExecuted: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          executionId: execution.id,
          output,
          duration,
          log: executionLog,
        },
      });
    } catch (execError) {
      // Marcar ejecución como fallida
      await db.flowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          error: execError instanceof Error ? execError.message : 'Error desconocido',
        },
      });

      throw execError;
    }
  } catch (error) {
    console.error('Error executing flow:', error);
    return NextResponse.json(
      { success: false, error: 'Error al ejecutar flujo' },
      { status: 500 }
    );
  }
}
