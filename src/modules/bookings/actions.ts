"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { firstIssue, type ActionState } from "@/lib/action-state";
import { clientFingerprint, hit } from "@/lib/rate-limit";
import { requireOrg } from "@/lib/session";
import { ownerStatusSchema, publicBookingSchema } from "./schema";
import { cancelByCustomer, createPublicBooking, isOverlapError, updateBookingStatus } from "./service";

/** Reserva feita pelo cliente final, sem login. */
export async function createPublicBookingAction(_: ActionState, formData: FormData): Promise<ActionState> {
  // Armadilha para robôs: campo escondido que pessoas não preenchem.
  if (formData.get("website")) return { error: "Não foi possível concluir a reserva." };

  const slug = String(formData.get("slug") ?? "");
  const parsed = publicBookingSchema.safeParse({
    serviceId: formData.get("serviceId"),
    staffId: formData.get("staffId") || undefined,
    startsAt: formData.get("startsAt"),
    name: formData.get("name"),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    consent: formData.get("consent"),
  });
  if (!parsed.success) return firstIssue(parsed.error);

  // Contra robôs e trotes: por aparelho/rede e por telefone.
  const fingerprint = await clientFingerprint();
  if (!(await hit(`book:ip:${fingerprint}`, 8, 10 * 60_000)) || !(await hit(`book:phone:${parsed.data.phone}`, 4, 60 * 60_000))) {
    return { error: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo." };
  }

  const result = await createPublicBooking(slug, parsed.data);
  if (!result.ok) return { error: result.error };
  redirect(`/agendar/${encodeURIComponent(slug)}/reserva/${result.manageToken}?nova=1`);
}

export async function cancelPublicBookingAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const slug = String(formData.get("slug") ?? "");
  const token = String(formData.get("token") ?? "");
  if (!(await cancelByCustomer(slug, token))) return { error: "Não foi possível cancelar. O horário pode já ter passado." };
  refresh();
  return { ok: "Agendamento cancelado. O horário foi liberado." };
}

export async function updateBookingStatusAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireOrg();
  const status = ownerStatusSchema.safeParse(formData.get("status"));
  if (!status.success) return { error: "Status inválido." };
  try {
    if (!(await updateBookingStatus(organization.id, String(formData.get("id")), status.data))) {
      return { error: "Agendamento não encontrado." };
    }
  } catch (e) {
    // Reativar um cancelado cujo horário já foi ocupado por outra reserva.
    if (isOverlapError(e)) return { error: "Esse horário já foi ocupado por outra reserva." };
    throw e;
  }
  refresh();
  return { ok: "Agendamento atualizado." };
}
