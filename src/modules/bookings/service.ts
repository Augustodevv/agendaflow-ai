import { db } from "@/lib/db";
import { addDays, localParts, zonedToUtc } from "@/lib/time";
import { getDaySlots } from "@/modules/availability/service";
import type { BookingStatus } from "@/generated/prisma/client";
import type { PublicBookingInput } from "./schema";

/** A exclusion constraint "booking_no_overlap" recusou a reserva (horário já ocupado). */
export function isOverlapError(e: unknown): boolean {
  const text = `${(e as Error)?.message ?? ""} ${JSON.stringify(e ?? {})}`;
  return text.includes("booking_no_overlap") || text.includes("23P01");
}

export type BookingResult = { ok: true; bookingId: string; manageToken: string } | { ok: false; error: string };

const TAKEN = "Esse horário acabou de ser reservado. Escolha outro, por favor.";

/**
 * Reserva feita pela página pública. Revalida tudo no servidor: o serviço é da
 * organização, o horário está na grade livre e o profissional pode atender.
 * Se dois clientes disputam o mesmo horário, o banco aceita só um.
 */
export async function createPublicBooking(slug: string, input: PublicBookingInput, now = new Date()): Promise<BookingResult> {
  const org = await db.organization.findUnique({ where: { slug } });
  if (!org) return { ok: false, error: "Negócio não encontrado." };
  const service = await db.service.findFirst({ where: { id: input.serviceId, organizationId: org.id, active: true } });
  if (!service) return { ok: false, error: "Serviço indisponível." };

  const startsAt = new Date(input.startsAt);
  const { isoDate } = localParts(startsAt, org.timezone);
  const slots = await getDaySlots({
    organizationId: org.id,
    timezone: org.timezone,
    serviceId: service.id,
    durationMinutes: service.durationMinutes,
    staffId: input.staffId || undefined,
    isoDate,
    now,
  });
  const slot = slots.find((s) => s.startsAt.getTime() === startsAt.getTime());
  if (!slot) return { ok: false, error: TAKEN };

  const customer = await db.customer.upsert({
    where: { organizationId_phone: { organizationId: org.id, phone: input.phone } },
    create: { organizationId: org.id, name: input.name, phone: input.phone, email: input.email, consentAt: now },
    update: { name: input.name, ...(input.email && { email: input.email }), consentAt: now },
  });

  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
  // "Sem preferência": tenta cada profissional livre até um aceitar.
  for (const staffId of slot.staffIds) {
    try {
      const booking = await db.booking.create({
        data: {
          organizationId: org.id,
          staffId,
          serviceId: service.id,
          customerId: customer.id,
          startsAt,
          endsAt,
          priceCents: service.priceCents,
          status: "CONFIRMED",
        },
      });
      return { ok: true, bookingId: booking.id, manageToken: booking.manageToken };
    } catch (e) {
      if (!isOverlapError(e)) throw e;
    }
  }
  return { ok: false, error: TAKEN };
}

/** Reserva acessada pelo link secreto (confirmação, lembrete). */
export function getBookingByToken(slug: string, token: string) {
  return db.booking.findFirst({
    where: { manageToken: token, organization: { slug } },
    include: { service: true, staff: true, organization: true },
  });
}

/** O próprio cliente cancela pelo link, até o horário marcado. */
export async function cancelByCustomer(slug: string, token: string, now = new Date()) {
  const { count } = await db.booking.updateMany({
    where: { manageToken: token, organization: { slug }, status: { in: ["CONFIRMED", "PENDING"] }, startsAt: { gt: now } },
    data: { status: "CANCELLED", cancelledAt: now },
  });
  return count === 1;
}

/** Reservas de um dia da agenda (no fuso da organização). */
export function listBookingsForDay(organizationId: string, timezone: string, isoDate: string, staffId?: string) {
  return db.booking.findMany({
    where: {
      organizationId,
      ...(staffId && { staffId }),
      startsAt: { gte: zonedToUtc(isoDate, 0, timezone), lt: zonedToUtc(addDays(isoDate, 1), 0, timezone) },
    },
    orderBy: { startsAt: "asc" },
    include: { service: true, staff: true, customer: true },
  });
}

export async function updateBookingStatus(organizationId: string, id: string, status: BookingStatus) {
  const { count } = await db.booking.updateMany({
    where: { id, organizationId },
    data: { status, cancelledAt: status === "CANCELLED" ? new Date() : null },
  });
  return count === 1;
}
