import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * DATABASE_URL tem prioridade. Na Vercel, a integração com bancos gerenciados também pode criar
 * POSTGRES_PRISMA_URL (conexão com pooler, própria para serverless).
 * Sem nenhuma das duas (ex.: durante o build), usa um endereço vazio: o app compila e qualquer consulta falha com erro claro.
 */
const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || "postgresql://sem-url-configurada@localhost:5432/sem_banco";

/**
 * O Prisma roda sem o motor nativo (engineType = "client") e conversa com o Postgres pelo driver `pg`.
 * Isso evita o erro de "motor não encontrado" em servidores serverless como o da Vercel.
 */
function createClient() {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 5 }) });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
