import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const items = await db.knowledgeBase.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { content: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching knowledge:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener conocimiento' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, category, priority } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'title y content son requeridos' }, { status: 400 });
    }

    const item = await db.knowledgeBase.create({
      data: {
        title,
        content,
        category: category || 'otro',
        priority: Number(priority || 0),
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating knowledge:', error);
    return NextResponse.json({ success: false, error: 'Error al crear conocimiento' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {
        // ignore
      }
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });
    }

    await db.knowledgeBase.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Artículo eliminado' });
  } catch (error) {
    console.error('Error deleting knowledge:', error);
    return NextResponse.json({ success: false, error: 'Error al eliminar' }, { status: 500 });
  }
}
