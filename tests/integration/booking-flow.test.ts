import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { zonedToUtc } from "@/lib/time";
import { getDaySlots } from "@/modules/availability/service";
import { createPublicBooking, updateBookingStatus } from "@/modules/bookings/service";
import { setServiceActive, updateService } from "@/modules/services/service";
import { addTimeBlock, removeTimeBlock, setAvailability, setStaffServices, updateStaff } from "@/modules/staff/service";
import { makeOrg } from "./helpers";

const TZ = "America/Sao_Paulo";
const DAY = "2027-03-10"; // quarta-feira
const NOW = new Date("2027-03-01T12:00:00Z");

afterAll(async () => {
  await db.organization.deleteMany({ where: { slug: { startsWith: "t-" } } });
  await db.$disconnect();
});

/** Organização pronta para receber reservas: quarta das 09:00 às 12:00. */
async function openOrg(tag: string) {
  const ctx = await makeOrg(tag);
  await setStaffServices(ctx.org.id, ctx.staff.id, [ctx.service.id]);
  await setAvailability(ctx.org.id, ctx.staff.id, [{ weekday: 3, startMinute: 540, endMinute: 720 }]);
  return ctx;
}

const input = (ctx: Awaited<ReturnType<typeof makeOrg>>, minute: number, phone = "11988887777") => ({
  serviceId: ctx.service.id,
  staffId: undefined,
  startsAt: zonedToUtc(DAY, minute, TZ).toISOString(),
  name: "Maria",
  phone,
  email: null,
  consent: "on" as const,
});

describe("reserva pela página pública", () => {
  it("reserva um horário livre e o remove da grade", async () => {
    const ctx = await openOrg("flow");
    const result = await createPublicBooking(ctx.org.slug, input(ctx, 600), NOW);
    expect(result.ok).toBe(true);
    const slots = await getDaySlots({ organizationId: ctx.org.id, timezone: TZ, serviceId: ctx.service.id, durationMinutes: 30, isoDate: DAY, now: NOW });
    expect(slots.map((s) => s.startsAt.toISOString())).not.toContain(zonedToUtc(DAY, 600, TZ).toISOString());
  });

  it("recusa horário fora da jornada (não confia no cliente)", async () => {
    const ctx = await openOrg("outside");
    const result = await createPublicBooking(ctx.org.slug, input(ctx, 22 * 60), NOW);
    expect(result.ok).toBe(false);
  });

  it("10 clientes disputando o mesmo horário: só 1 consegue", async () => {
    const ctx = await openOrg("race2");
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => createPublicBooking(ctx.org.slug, input(ctx, 540, `119000000${String(i).padStart(2, "0")}`), NOW)),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("sem preferência: usa outro profissional quando o primeiro está ocupado", async () => {
    const ctx = await openOrg("anystaff");
    const second = await db.staff.create({ data: { organizationId: ctx.org.id, name: "Segundo" } });
    await setStaffServices(ctx.org.id, second.id, [ctx.service.id]);
    await setAvailability(ctx.org.id, second.id, [{ weekday: 3, startMinute: 540, endMinute: 720 }]);
    const a = await createPublicBooking(ctx.org.slug, input(ctx, 540, "11911111111"), NOW);
    const b = await createPublicBooking(ctx.org.slug, input(ctx, 540, "11922222222"), NOW);
    expect(a.ok && b.ok).toBe(true);
    const staffIds = await db.booking.findMany({ where: { organizationId: ctx.org.id }, select: { staffId: true } });
    expect(new Set(staffIds.map((s) => s.staffId)).size).toBe(2);
  });

  it("respeita bloqueios e profissionais pausados", async () => {
    const ctx = await openOrg("blocked");
    const block = { startsAt: zonedToUtc(DAY, 540, TZ), endsAt: zonedToUtc(DAY, 600, TZ) };
    await addTimeBlock(ctx.org.id, ctx.staff.id, block);
    expect((await createPublicBooking(ctx.org.slug, input(ctx, 540), NOW)).ok).toBe(false);
    await updateStaff(ctx.org.id, ctx.staff.id, { active: false });
    expect((await createPublicBooking(ctx.org.slug, input(ctx, 660), NOW)).ok).toBe(false);
  });

  it("reaproveita o cliente pelo telefone", async () => {
    const ctx = await openOrg("customer");
    await createPublicBooking(ctx.org.slug, input(ctx, 540, "11977776666"), NOW);
    await createPublicBooking(ctx.org.slug, input(ctx, 600, "11977776666"), NOW);
    expect(await db.customer.count({ where: { organizationId: ctx.org.id, phone: "11977776666" } })).toBe(1);
  });
});

describe("isolamento entre empresas", () => {
  it("uma empresa não altera dados de outra", async () => {
    const a = await openOrg("iso-a");
    const b = await openOrg("iso-b");
    const data = { name: "Invasão", description: null, durationMinutes: 10, priceCents: 1 };

    expect(await updateService(a.org.id, b.service.id, data)).toBe(false);
    expect(await setServiceActive(a.org.id, b.service.id, false)).toBe(false);
    expect(await updateStaff(a.org.id, b.staff.id, { name: "Invasão" })).toBe(false);
    expect(await setAvailability(a.org.id, b.staff.id, [])).toBe(false);
    expect(await addTimeBlock(a.org.id, b.staff.id, { startsAt: new Date(), endsAt: new Date(Date.now() + 1000) })).toBe(false);

    const booked = await createPublicBooking(b.org.slug, input(b, 540), NOW);
    if (!booked.ok) throw new Error(booked.error);
    expect(await updateBookingStatus(a.org.id, booked.bookingId, "CANCELLED")).toBe(false);

    const blockB = await db.timeBlock.create({ data: { organizationId: b.org.id, staffId: b.staff.id, startsAt: new Date(), endsAt: new Date(Date.now() + 1000) } });
    expect(await removeTimeBlock(a.org.id, blockB.id)).toBe(false);

    // Serviço de outra empresa não entra na lista do profissional.
    await setStaffServices(a.org.id, a.staff.id, [a.service.id, b.service.id]);
    expect(await db.staffService.count({ where: { staffId: a.staff.id } })).toBe(1);

    // Nada mudou na empresa B.
    expect((await db.service.findUnique({ where: { id: b.service.id } }))?.name).toBe("Corte");
    expect((await db.booking.findUnique({ where: { id: booked.bookingId } }))?.status).toBe("CONFIRMED");
  });

  it("não reserva serviço de outra empresa pelo slug errado", async () => {
    const a = await openOrg("iso-c");
    const b = await openOrg("iso-d");
    expect((await createPublicBooking(a.org.slug, input(b, 540), NOW)).ok).toBe(false);
  });
});
