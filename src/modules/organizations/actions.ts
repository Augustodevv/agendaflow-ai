"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { createOrganizationSchema } from "./schema";
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
