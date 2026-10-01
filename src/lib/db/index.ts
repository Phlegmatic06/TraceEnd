// ──────────────────────────────────────────────────────────────
// TraceEnd — Prisma Client Singleton (Prisma 7)
// Uses adapter pattern required by Prisma 7.
// Prevents connection pool exhaustion in development (hot reload).
// ──────────────────────────────────────────────────────────────

import 'dotenv/config';
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/traceend?schema=public';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const pool = globalForPrisma.pool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== 'production') globalForPrisma.pool = pool;

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
