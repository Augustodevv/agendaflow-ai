"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { db } from "@/lib/db";
import { requireOrg, requireUser } from "@/lib/session";
import { createOrganizationSchema, organizationProfileSchema } from "./schema";
import { createOrganizationForUser } from "./service";

export type FormState = { error?: string } | undefined;

export async function createOrganization(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = createOrganizationSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.membership.findFirst({ where: { userId: user.id } });
  if (!existing) await createOrganizationForUser(user.id, parsed.data.name);
  redirect("/painel");
}

/** Atualiza dados públicos do negócio (nome e WhatsApp exibidos na página de reservas). */
export async function updateOrganizationProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireOrg();
  const parsed = organizationProfileSchema.safeParse({ name: formData.get("name"), phone: String(formData.get("phone") ?? "") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.organization.update({ where: { id: organization.id }, data: parsed.data });
  refresh();
  return { ok: "Dados do negócio salvos." };
}
