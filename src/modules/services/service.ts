import { db } from "@/lib/db";
import type { ServiceInput } from "./schema";

// Toda função recebe organizationId e filtra por ele: um negócio nunca enxerga dados de outro.

export function listServices(organizationId: string, onlyActive = false) {
  return db.service.findMany({
    where: { organizationId, ...(onlyActive && { active: true }) },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export function createService(organizationId: string, input: ServiceInput) {
  return db.service.create({ data: { organizationId, ...input } });
}

/** Retorna false se o serviço não existe ou é de outra organização. */
export async function updateService(organizationId: string, id: string, input: ServiceInput) {
  const { count } = await db.service.updateMany({ where: { id, organizationId }, data: input });
  return count === 1;
}

export async function setServiceActive(organizationId: string, id: string, active: boolean) {
  const { count } = await db.service.updateMany({ where: { id, organizationId }, data: { active } });
  return count === 1;
}
