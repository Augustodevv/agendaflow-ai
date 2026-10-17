/**
 * URL pública do site, sem barra no final.
 * Na Vercel, usa o domínio que a própria plataforma informa (produção ou preview), então não depende de
 * variáveis digitadas à mão. Fora dela, usa NEXT_PUBLIC_APP_URL / BETTER_AUTH_URL ou localhost.
 */
export function appUrl(env: Record<string, string | undefined> = process.env): string {
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (env.VERCEL_ENV === "preview" && env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return (env.NEXT_PUBLIC_APP_URL || env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}
