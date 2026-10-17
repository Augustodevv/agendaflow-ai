import { db } from "@/lib/db";
import { addDays, zonedToUtc } from "@/lib/time";
import { computeSlots } from "./slots";

export const ACTIVE_STATUSES = ["PENDING", "CONFIRMED"] as const;

/** Profissionais ativos da organização que realizam o serviço. */
export function eligibleStaff(organizationId: string, serviceId: string) {
  return db.staff.findMany({
    where: { organizationId, active: true, services: { some: { serviceId } } },
    orderBy: { name: "asc" },
    include: { availability: true },
  });
}

export type DaySlot = { startsAt: Date; staffIds: string[] };

/**
 * Horários livres de um dia para um serviço. Com staffId, só daquele profissional;
 * sem ele ("sem preferência"), junta todos e guarda quem está livre em cada horário.
 */
export async function getDaySlots(params: {
  organizationId: string;
  timezone: string;
  serviceId: string;
  durationMinutes: number;
  staffId?: string;
  isoDate: string;
  now?: Date;
}): Promise<DaySlot[]> {
  const { organizationId, timezone, isoDate } = params;
  let staff = await eligibleStaff(organizationId, params.serviceId);
  if (params.staffId) staff = staff.filter((s) => s.id === params.staffId);
  if (staff.length === 0) return [];

  const dayStart = zonedToUtc(isoDate, 0, timezone);
  const dayEnd = zonedToUtc(addDays(isoDate, 1), 0, timezone);
  const staffIds = staff.map((s) => s.id);
  const range = { startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } };

  const [bookings, blocks] = await Promise.all([
    db.booking.findMany({
      where: { organizationId, staffId: { in: staffIds }, status: { in: [...ACTIVE_STATUSES] }, ...range },
      select: { staffId: true, startsAt: true, endsAt: true },
    }),
    db.timeBlock.findMany({
      where: { organizationId, staffId: { in: staffIds }, ...range },
      select: { staffId: true, startsAt: true, endsAt: true },
    }),
  ]);

  const byTime = new Map<number, DaySlot>();
  for (const member of staff) {
    const busy = [...bookings, ...blocks].filter((b) => b.staffId === member.id);
    const slots = computeSlots({
      isoDate,
      timezone,
      durationMinutes: params.durationMinutes,
      rules: member.availability,
      busy,
      now: params.now ?? new Date(),
    });
    for (const startsAt of slots) {
      const entry = byTime.get(startsAt.getTime()) ?? { startsAt, staffIds: [] };
      entry.staffIds.push(member.id);
      byTime.set(startsAt.getTime(), entry);
    }
  }
  return [...byTime.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
