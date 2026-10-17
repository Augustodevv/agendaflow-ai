"use server";

import { refresh } from "next/cache";
import { firstIssue, type ActionState } from "@/lib/action-state";
import { requireOrg } from "@/lib/session";
import { serviceSchema } from "./schema";
import { createService, setServiceActive, updateService } from "./service";

function parse(formData: FormData) {
  return serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    durationMinutes: formData.get("durationMinutes"),
    priceCents: String(formData.get("price") ?? ""),
  });
}

export async function createServiceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireOrg();
  const parsed = parse(formData);
  if (!parsed.success) return firstIssue(parsed.error);
  await createService(organization.id, parsed.data);
  refresh();
  return { ok: "Serviço criado." };
}

export async function updateServiceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireOrg();
  const parsed = parse(formData);
  if (!parsed.success) return firstIssue(parsed.error);
  if (!(await updateService(organization.id, String(formData.get("id")), parsed.data))) {
    return { error: "Serviço não encontrado." };
  }
  refresh();
  return { ok: "Alterações salvas." };
}

export async function toggleServiceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireOrg();
  const active = formData.get("active") === "true";
  if (!(await setServiceActive(organization.id, String(formData.get("id")), active))) {
    return { error: "Serviço não encontrado." };
  }
  refresh();
  return { ok: active ? "Serviço reativado." : "Serviço pausado." };
}
