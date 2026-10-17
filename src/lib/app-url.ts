type Env = Record<string, string | undefined>;

/**
 * URL pública do site, sem barra no final.
 * Na Vercel, usa o domínio que a própria plataforma informa (produção ou preview), então não depende de
 * variáveis digitadas à mão. Fora dela, usa NEXT_PUBLIC_APP_URL / BETTER_AUTH_URL ou localhost.
 */
export function appUrl(env: Env = process.env): string {
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (env.VERCEL_ENV === "preview" && env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return (env.NEXT_PUBLIC_APP_URL || env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Origens que podem chamar a API de autenticação (proteção contra CSRF).
 * Além da URL principal, aceita os endereços DESTE projeto na Vercel (alias do time, de branch e de cada deploy),
 * calculados a partir das variáveis de sistema. Domínios de outros projetos não entram.
 *
 * Formato dos hosts da Vercel: `<projeto>-<hash>-<time>.vercel.app`, `<projeto>-git-<branch>-<time>.vercel.app`
 * e `<projeto>-<time>.vercel.app`.
 */
export function trustedOrigins(env: Env = process.env): string[] {
  const origins = new Set<string>([appUrl(env)]);
  for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (host) origins.add(`https://${host}`);
  }

  const project = env.VERCEL_GIT_REPO_SLUG;
  const deployHost = env.VERCEL_URL?.replace(/\.vercel\.app$/, "");
  if (project && deployHost?.startsWith(`${project}-`)) {
    // resto = "<hash>-<time>"; o hash não tem hífen, então o time é tudo depois do primeiro hífen.
    const rest = deployHost.slice(project.length + 1);
    const team = rest.slice(rest.indexOf("-") + 1);
    if (team && rest.includes("-")) {
      origins.add(`https://${project}-${team}.vercel.app`);
      origins.add(`https://${project}-*-${team}.vercel.app`);
    }
  }
  return [...origins];
}
