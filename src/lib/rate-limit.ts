import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Limite por janela deslizante guardado no PostgreSQL. Retorna true se ainda pode.
 * Simples e sem serviço extra; para volume alto, trocar por Redis.
 */
export async function hit(key: string, limit: number, windowMs: number, now = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() - windowMs);
  const count = await db.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
  if (count >= limit) return false;
  await db.rateLimitHit.create({ data: { key, createdAt: now } });
  // Limpeza oportunista para a tabela não crescer sem fim.
  if (Math.random() < 0.01) await db.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 86_400_000) } } });
  return true;
}

/** IP do visitante transformado em hash: serve para limitar abuso sem guardar o IP (LGPD). */
export async function clientFingerprint(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return createHash("sha256").update(`${ip}:${process.env.BETTER_AUTH_SECRET ?? ""}`).digest("hex").slice(0, 32);
}
