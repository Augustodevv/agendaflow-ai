"use server";

import { refresh } from "next/cache";
import { firstIssue, type ActionState } from "@/lib/action-state";
import { requireOrg } from "@/lib/session";
import { canActivateStaff } from "@/modules/billing/limits";
import { listServices } from "@/modules/services/service";
import { blockToInterval, parseWeek, staffNameSchema, timeBlockSchema } from "./schema";
import { addTimeBlock, createStaff, removeTimeBlock, setAvailability, setStaffServices, updateStaff } from "./service";

const NOT_FOUND: ActionState = { error: "Profissional não encontrado." };
const STAFF_LIMIT: ActionState = { error: "Seu plano atingiu o limite de profissionais. Faça upgrade em Assinatura." };

export async function createStaffAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireOrg();
  const parsed = staffNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return firstIssue(parsed.error);
  if (!(await canActivateStaff(organization))) return STAFF_LIMIT;
  const staff = await createStaff(organization.id, parsed.data.name);
  // Facilita o começo: o novo profissional já realiza todos os serviços ativos.
  const services = await listServices(organization.id, true);
  await setStaffServices(organization.id, staff.id, services.map((s) => s.id));
  refresh();
  return { ok: "Profissional adicionado. Defina a jornada dele abaixo." };
}

export async function renameStaffAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireOrg();
  const parsed = staffNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return firstIssue(parsed.error);
  if (!(await updateStaff(organization.id, String(formData.get("id")), { name: parsed.data.name }))) return NOT_FOUND;
  refresh();
  return { ok: "Nome salvo." };
}

export async function toggleStaffAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireOrg();
  const active = formData.get("active") === "true";
  if (active && !(await canActivateStaff(organization))) return STAFF_LIMIT;
  if (!(await updateStaff(organization.id, String(formData.get("id")), { active }))) return NOT_FOUND;
  refresh();
  return { ok: active ? "Profissional reativado." : "Profissional pausado: não aparece mais para reservas." };
}

export async function saveStaffServicesAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireOrg();
  const ids = formData.getAll("serviceIds").map(String);
  if (!(await setStaffServices(organization.id, String(formData.get("id")), ids))) return NOT_FOUND;
  refresh();
  return { ok: "Serviços salvos." };
}

export async function saveAvailabilityAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireOrg();
  const days = Array.from({ length: 7 }, (_, d) => ({
    enabled: formData.get(`d${d}.enabled`) === "on",
    start: String(formData.get(`d${d}.start`) ?? ""),
    end: String(formData.get(`d${d}.end`) ?? ""),
    breakStart: String(formData.get(`d${d}.breakStart`) ?? ""),
    breakEnd: String(formData.get(`d${d}.breakEnd`) ?? ""),
  }));
  const result = parseWeek(days);
  if ("error" in result) return { error: result.error };
  if (!(await setAvailability(organization.id, String(formData.get("id")), result.rules))) return NOT_FOUND;
  refresh();
  return { ok: "Jornada salva." };
}

export async function addTimeBlockAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireOrg();
  const parsed = timeBlockSchema.safeParse({
    date: formData.get("date"),
    start: formData.get("start"),
    end: formData.get("end"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const interval = blockToInterval(parsed.data, organization.timezone);
  if (!(await addTimeBlock(organization.id, String(formData.get("id")), { ...interval, reason: parsed.data.reason }))) {
    return NOT_FOUND;
  }
  refresh();
  return { ok: "Bloqueio adicionado." };
}

export async function removeTimeBlockAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireOrg();
  if (!(await removeTimeBlock(organization.id, String(formData.get("blockId"))))) return { error: "Bloqueio não encontrado." };
  refresh();
  return { ok: "Bloqueio removido." };
}
