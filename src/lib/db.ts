import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('http')) {
    const authToken =
      process.env.TURSO_AUTH_TOKEN ||
      process.env.DATABASE_AUTH_TOKEN ||
      process.env.LIBSQL_AUTH_TOKEN ||
      process.env.AUTH_TOKEN;

    const libsql = createClient({
      url: databaseUrl,
      authToken,
    });

    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({ adapter } as never);
  }

  return new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

export default db;
