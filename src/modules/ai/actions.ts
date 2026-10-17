"use server";

import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/time";
import { requireOrg } from "@/lib/session";
import { collectMetrics } from "./metrics";
import { messagePrompt, occupancyPrompt, summaryPrompt, type MessageKind } from "./prompts";
import { generate } from "./service";

export type AiState = { error?: string; text?: string } | undefined;

export async function summaryAction(): Promise<AiState> {
  const { organization } = await requireOrg();
  const metrics = await collectMetrics(organization.id, organization.timezone);
  const result = await generate(organization, summaryPrompt(metrics));
  return result.ok ? { text: result.text } : { error: result.error };
}

export async function occupancyAction(): Promise<AiState> {
  const { organization } = await requireOrg();
  const metrics = await collectMetrics(organization.id, organization.timezone);
  const result = await generate(organization, occupancyPrompt(metrics));
  return result.ok ? { text: result.text } : { error: result.error };
}

export async function messageAction(_: AiState, formData: FormData): Promise<AiState> {
  const { organization } = await requireOrg();
  const kind: MessageKind = formData.get("kind") === "reschedule" ? "reschedule" : "confirmation";
  const tone = formData.get("tone") === "formal" ? "formal" : "amigavel";

  // organizationId no filtro: só dá para gerar mensagem de reserva do próprio negócio.
  const booking = await db.booking.findFirst({
    where: { id: String(formData.get("bookingId")), organizationId: organization.id },
    include: { customer: true, service: true },
  });
  if (!booking) return { error: "Escolha uma reserva da lista." };

  const when = `${formatDate(booking.startsAt, organization.timezone)} às ${formatTime(booking.startsAt, organization.timezone)}`;
  const result = await generate(
    organization,
    messagePrompt({
      kind,
      tone,
      businessName: organization.name,
      customerFirstName: booking.customer.name.split(" ")[0],
      serviceName: booking.service.name,
      whenLabel: when,
    }),
  );
  return result.ok ? { text: result.text } : { error: result.error };
}
