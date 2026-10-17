import { db } from "@/lib/db";
import { localParts, WEEKDAY_LABELS } from "@/lib/time";
import type { MetricsInput } from "./prompts";

/** Números reais dos últimos 30 dias, calculados do banco. A IA só recebe isto, nunca inventa. */
export async function collectMetrics(organizationId: string, timezone: string, now = new Date()): Promise<MetricsInput> {
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const period = { organizationId, startsAt: { gte: since, lt: now } };

  const [byStatus, revenue, newCustomers, services, active] = await Promise.all([
    db.booking.groupBy({ by: ["status"], where: period, _count: true }),
    db.booking.aggregate({ where: { ...period, status: "COMPLETED" }, _sum: { priceCents: true } }),
    db.customer.count({ where: { organizationId, createdAt: { gte: since } } }),
    db.booking.groupBy({
      by: ["serviceId"],
      where: { ...period, status: { in: ["COMPLETED", "CONFIRMED"] } },
      _count: true,
      orderBy: { _count: { serviceId: "desc" } },
      take: 3,
    }),
    db.booking.findMany({
      where: { ...period, status: { in: ["COMPLETED", "CONFIRMED", "PENDING"] } },
      select: { startsAt: true },
    }),
  ]);

  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const names = await db.service.findMany({
    where: { organizationId, id: { in: services.map((s) => s.serviceId) } },
    select: { id: true, name: true },
  });

  const perWeekday = new Array(7).fill(0) as number[];
  for (const b of active) perWeekday[localParts(b.startsAt, timezone).weekday]++;

  return {
    periodLabel: "últimos 30 dias",
    bookingsCompleted: count("COMPLETED"),
    bookingsCancelled: count("CANCELLED"),
    noShows: count("NO_SHOW"),
    revenueCents: revenue._sum.priceCents ?? 0,
    newCustomers,
    topServices: services.map((s) => ({ name: names.find((n) => n.id === s.serviceId)?.name ?? "Serviço", count: s._count })),
    bookingsByWeekday: perWeekday.map((n, i) => ({ weekday: WEEKDAY_LABELS[i], count: n })),
  };
}
