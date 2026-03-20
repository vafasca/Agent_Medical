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

// GET - Obtener artículo por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const knowledge = getKnowledge();
    const item = knowledge.find(k => k.id === id);

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error fetching knowledge:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener artículo' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar artículo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const knowledge = getKnowledge();
    const index = knowledge.findIndex(k => k.id === id);
    
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar campos
    if (body.title) knowledge[index].title = body.title;
    if (body.content) knowledge[index].content = body.content;
    if (body.category !== undefined) knowledge[index].category = body.category;
    if (body.priority !== undefined) knowledge[index].priority = body.priority;
    if (body.isActive !== undefined) knowledge[index].isActive = body.isActive;
    knowledge[index].updatedAt = new Date().toISOString();

    saveKnowledge(knowledge);

    return NextResponse.json({
      success: true,
      data: knowledge[index],
    });
  } catch (error) {
    console.error('Error updating knowledge:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar artículo' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar artículo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      { success: false, error: 'Error al eliminar artículo' },
      { status: 500 }
    );
  }
}
