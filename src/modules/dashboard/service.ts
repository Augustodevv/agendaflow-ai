import { db } from "@/lib/db";
import { addDays, localParts, zonedToUtc } from "@/lib/time";

/** Indicadores do painel, sempre no fuso da organização. */
export async function getDashboard(organizationId: string, timezone: string, now = new Date()) {
  const today = localParts(now, timezone).isoDate;
  const todayStart = zonedToUtc(today, 0, timezone);
  const tomorrowStart = zonedToUtc(addDays(today, 1), 0, timezone);
  const monthStart = zonedToUtc(`${today.slice(0, 8)}01`, 0, timezone);
  const last30 = new Date(now.getTime() - 30 * 86_400_000);

  const [todayBookings, upcoming, monthRevenue, monthCompleted, attendance, newCustomers, setup] = await Promise.all([
    db.booking.count({
      where: { organizationId, startsAt: { gte: todayStart, lt: tomorrowStart }, status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] } },
    }),
    db.booking.findMany({
      where: { organizationId, startsAt: { gte: now }, status: { in: ["CONFIRMED", "PENDING"] } },
      orderBy: { startsAt: "asc" },
      take: 6,
      include: { service: true, staff: true, customer: true },
    }),
    db.booking.aggregate({
      where: { organizationId, startsAt: { gte: monthStart }, status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] } },
      _sum: { priceCents: true },
    }),
    db.booking.aggregate({
      where: { organizationId, startsAt: { gte: monthStart }, status: "COMPLETED" },
      _sum: { priceCents: true },
    }),
    db.booking.groupBy({
      by: ["status"],
      where: { organizationId, startsAt: { gte: last30, lt: now }, status: { in: ["COMPLETED", "NO_SHOW"] } },
      _count: true,
    }),
    db.customer.count({ where: { organizationId, createdAt: { gte: monthStart } } }),
    Promise.all([
      db.service.count({ where: { organizationId, active: true } }),
      db.staff.count({ where: { organizationId, active: true } }),
      db.availabilityRule.count({ where: { organizationId } }),
    ]),
  ]);

  const completed = attendance.find((a) => a.status === "COMPLETED")?._count ?? 0;
  const noShow = attendance.find((a) => a.status === "NO_SHOW")?._count ?? 0;
  const [services, staff, rules] = setup;

  return {
    todayBookings,
    upcoming,
    monthRevenueCents: monthRevenue._sum.priceCents ?? 0,
    monthCompletedCents: monthCompleted._sum.priceCents ?? 0,
    noShowRate: completed + noShow > 0 ? noShow / (completed + noShow) : null,
    newCustomers,
    setup: { hasServices: services > 0, hasStaff: staff > 0, hasAvailability: rules > 0 },
  };
}
