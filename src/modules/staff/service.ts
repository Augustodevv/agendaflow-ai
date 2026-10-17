import { db } from "@/lib/db";

export function listStaff(organizationId: string) {
  return db.staff.findMany({
    where: { organizationId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { services: { select: { serviceId: true } }, availability: true },
  });
}

export function getStaff(organizationId: string, id: string) {
  return db.staff.findFirst({
    where: { id, organizationId },
    include: {
      services: { select: { serviceId: true } },
      availability: { orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] },
      timeBlocks: { where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } },
    },
  });
}

export function createStaff(organizationId: string, name: string) {
  return db.staff.create({ data: { organizationId, name } });
}

export async function updateStaff(organizationId: string, id: string, data: { name?: string; active?: boolean }) {
  const { count } = await db.staff.updateMany({ where: { id, organizationId }, data });
  return count === 1;
}

/** Define quais serviços o profissional realiza. Ignora ids de outras organizações. */
export async function setStaffServices(organizationId: string, staffId: string, serviceIds: string[]) {
  const staff = await db.staff.findFirst({ where: { id: staffId, organizationId }, select: { id: true } });
  if (!staff) return false;
  const valid = await db.service.findMany({ where: { organizationId, id: { in: serviceIds } }, select: { id: true } });
  await db.$transaction([
    db.staffService.deleteMany({ where: { staffId } }),
    db.staffService.createMany({ data: valid.map((s) => ({ staffId, serviceId: s.id })) }),
  ]);
  return true;
}

/** Substitui a jornada semanal inteira do profissional. */
export async function setAvailability(
  organizationId: string,
  staffId: string,
  rules: { weekday: number; startMinute: number; endMinute: number }[],
) {
  const staff = await db.staff.findFirst({ where: { id: staffId, organizationId }, select: { id: true } });
  if (!staff) return false;
  await db.$transaction([
    db.availabilityRule.deleteMany({ where: { staffId, organizationId } }),
    db.availabilityRule.createMany({ data: rules.map((r) => ({ ...r, staffId, organizationId })) }),
  ]);
  return true;
}

export async function addTimeBlock(
  organizationId: string,
  staffId: string,
  block: { startsAt: Date; endsAt: Date; reason?: string },
) {
  const staff = await db.staff.findFirst({ where: { id: staffId, organizationId }, select: { id: true } });
  if (!staff) return false;
  await db.timeBlock.create({ data: { organizationId, staffId, ...block } });
  return true;
}

export async function removeTimeBlock(organizationId: string, id: string) {
  const { count } = await db.timeBlock.deleteMany({ where: { id, organizationId } });
  return count === 1;
}
