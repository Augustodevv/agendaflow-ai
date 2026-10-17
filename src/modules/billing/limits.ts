import type { Plan } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { limitsFor } from "./plans";

/** True se a organização ainda pode ter mais um profissional ativo no plano atual. */
export async function canActivateStaff(org: { id: string; plan: Plan }): Promise<boolean> {
  const active = await db.staff.count({ where: { organizationId: org.id, active: true } });
  return active < limitsFor(org.plan).maxStaff;
}
