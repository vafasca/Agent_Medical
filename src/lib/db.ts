import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  
  // Detectar si es Turso/libsql o SQLite local
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('http')) {
    // Turso/libsql
    const libsql = createClient({
      url: databaseUrl,
    });
    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({ adapter } as never);
  }
  
  // SQLite local
  return new PrismaClient({
    datasources: {
      db: { url: databaseUrl }
    }
  });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export default db;
