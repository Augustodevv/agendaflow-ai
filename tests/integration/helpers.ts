import { db } from "@/lib/db";

export async function makeOrg(tag: string) {
  const org = await db.organization.create({ data: { name: `Org ${tag}`, slug: `t-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` } });
  const staff = await db.staff.create({ data: { organizationId: org.id, name: "Profissional" } });
  const service = await db.service.create({
    data: { organizationId: org.id, name: "Corte", durationMinutes: 30, priceCents: 4000 },
  });
  const customer = await db.customer.create({
    data: { organizationId: org.id, name: "Cliente", phone: "11999990000", consentAt: new Date() },
  });
  return { org, staff, service, customer };
}

export function bookingData(ctx: Awaited<ReturnType<typeof makeOrg>>, start: Date, minutes = 30) {
  return {
    organizationId: ctx.org.id,
    staffId: ctx.staff.id,
    serviceId: ctx.service.id,
    customerId: ctx.customer.id,
    startsAt: start,
    endsAt: new Date(start.getTime() + minutes * 60_000),
    priceCents: 4000,
  };
}
