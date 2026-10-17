import { db } from "@/lib/db";

export const monthKey = (now = new Date()) => now.toISOString().slice(0, 7);

/**
 * Reserva 1 chamada de IA no mês, de forma atômica: o UPDATE só acontece se ainda houver saldo,
 * então chamadas simultâneas nunca passam do limite. Retorna false se o limite acabou.
 */
export async function reserveAiRequest(organizationId: string, limit: number, now = new Date()): Promise<boolean> {
  if (limit <= 0) return false;
  const month = monthKey(now);
  await db.aiUsage.upsert({
    where: { organizationId_month: { organizationId, month } },
    create: { organizationId, month },
    update: {},
  });
  const reserved = await db.aiUsage.updateMany({
    where: { organizationId, month, requests: { lt: limit } },
    data: { requests: { increment: 1 } },
  });
  return reserved.count === 1;
}

/** Devolve a reserva quando a chamada ao modelo falha (o cliente não paga por erro). */
export async function releaseAiRequest(organizationId: string, now = new Date()) {
  await db.aiUsage.updateMany({
    where: { organizationId, month: monthKey(now), requests: { gt: 0 } },
    data: { requests: { decrement: 1 } },
  });
}

export async function recordAiTokens(organizationId: string, inputTokens: number, outputTokens: number, now = new Date()) {
  await db.aiUsage.update({
    where: { organizationId_month: { organizationId, month: monthKey(now) } },
    data: { inputTokens: { increment: inputTokens }, outputTokens: { increment: outputTokens } },
  });
}

export async function getAiUsage(organizationId: string, now = new Date()) {
  const row = await db.aiUsage.findUnique({ where: { organizationId_month: { organizationId, month: monthKey(now) } } });
  return { requests: row?.requests ?? 0, inputTokens: row?.inputTokens ?? 0, outputTokens: row?.outputTokens ?? 0 };
}
