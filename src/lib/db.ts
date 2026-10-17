import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * DATABASE_URL tem prioridade. Na Vercel, a integração com o Supabase cria POSTGRES_PRISMA_URL
 * (conexão com pooler, própria para serverless), então ela serve de alternativa sem ninguém digitar senha.
 */
const datasourceUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || undefined;

export const db = globalForPrisma.prisma ?? new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
