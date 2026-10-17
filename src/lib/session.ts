import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Exige login. Redireciona para /entrar se não houver sessão. */
export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");
  return session.user;
}

/**
 * Exige login E organização. É a porta de entrada de todo código do painel:
 * o organizationId sempre vem daqui (do servidor), nunca de parâmetro do cliente.
 */
export async function requireOrg() {
  const user = await requireUser();
  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });
  if (!membership) redirect("/onboarding");
  return { user, organization: membership.organization, role: membership.role };
}
