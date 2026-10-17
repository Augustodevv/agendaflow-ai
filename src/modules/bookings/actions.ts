"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { firstIssue, type ActionState } from "@/lib/action-state";
import { requireOrg } from "@/lib/session";
import { ownerStatusSchema, publicBookingSchema } from "./schema";
import { createPublicBooking, isOverlapError, updateBookingStatus } from "./service";

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

  const result = await createPublicBooking(slug, parsed.data);
  if (!result.ok) return { error: result.error };
  redirect(`/agendar/${encodeURIComponent(slug)}/confirmado?id=${result.bookingId}`);
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
