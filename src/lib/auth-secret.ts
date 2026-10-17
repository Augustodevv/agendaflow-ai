import { createHmac } from "node:crypto";

/**
 * Segredo de assinatura das sessões.
 * BETTER_AUTH_SECRET tem prioridade. Sem ele, deriva uma chave (HMAC-SHA256) da conexão do banco,
 * que já é um segredo e nunca sai do servidor. Assim o deploy na Vercel com a integração do Supabase
 * funciona sem ninguém copiar um segredo à mão.
 * Contrapartida: trocar a senha do banco invalida as sessões abertas (todos precisam entrar de novo).
 */
export function resolveAuthSecret(env: Record<string, string | undefined> = process.env): string | undefined {
  if (env.BETTER_AUTH_SECRET) return env.BETTER_AUTH_SECRET;
  const source = env.POSTGRES_PRISMA_URL || env.DATABASE_URL;
  if (!source) return undefined;
  return createHmac("sha256", "agendaflow-ai/auth-secret/v1").update(source).digest("base64");
}
