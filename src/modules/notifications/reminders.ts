import { db } from "@/lib/db";
import { limitsFor } from "@/modules/billing/plans";
import { manageUrl } from "./messages";
import { sendWhatsAppReminder, type ReminderSender } from "./whatsapp";

/** Envia lembrete para reservas confirmadas que começam nas próximas `hoursAhead` horas. */
export async function sendDueReminders({
  now = new Date(),
  hoursAhead = 24,
  send = sendWhatsAppReminder,
}: { now?: Date; hoursAhead?: number; send?: ReminderSender } = {}) {
  const due = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startsAt: { gt: now, lte: new Date(now.getTime() + hoursAhead * 3_600_000) },
    },
    include: { customer: true, service: true, staff: true, organization: true },
    orderBy: { startsAt: "asc" },
    take: 200,
  });

  let sent = 0;
  const failures: string[] = [];
  for (const b of due) {
    // Lembrete automático depende do plano (o botão manual na agenda vale para todos).
    if (!limitsFor(b.organization.plan).autoReminders) continue;
    // Reserva o envio antes de mandar: se o job rodar duas vezes em paralelo, só um envia.
    const claim = await db.booking.updateMany({ where: { id: b.id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (claim.count === 0) continue;

    const result = await send({
      customerName: b.customer.name,
      customerPhone: b.customer.phone,
      businessName: b.organization.name,
      serviceName: b.service.name,
      staffName: b.staff.name,
      startsAt: b.startsAt,
      timezone: b.organization.timezone,
      manageUrl: manageUrl(b.organization.slug, b.manageToken),
    }).catch((e: Error) => ({ sent: false as const, reason: e.message }));

    if (result.sent) {
      sent++;
    } else {
      // Libera para a próxima rodada tentar de novo.
      await db.booking.update({ where: { id: b.id }, data: { reminderSentAt: null } });
      failures.push(result.reason);
    }
  }
  return { due: due.length, sent, failures: [...new Set(failures)] };
}
