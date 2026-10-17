import { db } from "@/lib/db";
import { isReservedSlug, slugify } from "@/lib/slug";

/** Cria a organização e o vínculo de dono em uma única transação. Gera slug único. */
export async function createOrganizationForUser(userId: string, name: string) {
  const base = slugify(name) || "negocio";
  for (let attempt = 0; attempt < 20; attempt++) {
    const slug = attempt === 0 && !isReservedSlug(base) ? base : `${base}-${attempt + 1}`;
    try {
      return await db.organization.create({
        data: { name, slug, memberships: { create: { userId, role: "OWNER" } } },
      });
    } catch (e) {
      // P2002 = slug já existe: tenta o próximo
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  throw new Error("Não foi possível gerar um endereço único para o negócio.");
}
