import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = '/home/z/my-project/data';
const API_KEYS_FILE = path.join(DATA_DIR, 'api-keys.json');

// GET - Obtener configuraciones
export async function GET() {
  try {
    let hasApiKey = false;
    let activeModel = null;
    
    if (fs.existsSync(API_KEYS_FILE)) {
      const keys = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf-8'));
      const activeKey = keys.find((k: { isActive: boolean }) => k.isActive);
      hasApiKey = !!activeKey;
      activeModel = activeKey?.model || null;
    }

    return NextResponse.json({
      success: true,
      data: {
        hasApiKey,
        activeModel,
      },
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}
