import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = '/home/z/my-project/data';
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'knowledge.json');

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getKnowledge(): KnowledgeItem[] {
  ensureDataDir();
  if (!fs.existsSync(KNOWLEDGE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveKnowledge(items: KnowledgeItem[]) {
  ensureDataDir();
  fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(items, null, 2));
}

// GET - Listar base de conocimiento
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');

    let knowledge = getKnowledge();

    // Filtrar por activos
    knowledge = knowledge.filter(k => k.isActive);

    // Filtrar por categoría
    if (category) {
      knowledge = knowledge.filter(k => k.category === category);
    }

    // Buscar
    if (search) {
      const searchLower = search.toLowerCase();
      knowledge = knowledge.filter(k => 
        k.title.toLowerCase().includes(searchLower) ||
        k.content.toLowerCase().includes(searchLower)
      );
    }

    // Ordenar por prioridad
    knowledge.sort((a, b) => b.priority - a.priority);

    // Limitar
    knowledge = knowledge.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: knowledge,
    });
  } catch (error) {
    console.error('Error fetching knowledge:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener conocimiento' },
      { status: 500 }
    );
  }
}

// POST - Crear artículo de conocimiento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, category, priority } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'title y content son requeridos' },
        { status: 400 }
      );
    }

    const knowledge = getKnowledge();

    const newItem: KnowledgeItem = {
      id: `know-${Date.now()}`,
      title,
      content,
      category: category || 'otro',
      priority: priority || 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    knowledge.push(newItem);
    saveKnowledge(knowledge);

    return NextResponse.json({
      success: true,
      data: newItem,
    });
  } catch (error) {
    console.error('Error creating knowledge:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear conocimiento' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar artículo (por query param o body)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    
    // Si no hay id en query params, intentar leer del body
    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {
        // Ignore JSON parse errors
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID requerido' },
        { status: 400 }
      );
    }

    const knowledge = getKnowledge();
    const filtered = knowledge.filter(k => k.id !== id);
    
    if (filtered.length === knowledge.length) {
      return NextResponse.json(
        { success: false, error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    saveKnowledge(filtered);

    return NextResponse.json({
      success: true,
      message: 'Artículo eliminado',
    });
  } catch (error) {
    console.error('Error deleting knowledge:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar' },
      { status: 500 }
    );
  }
}
