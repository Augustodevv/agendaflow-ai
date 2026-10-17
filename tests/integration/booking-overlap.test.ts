import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { bookingData, makeOrg } from "./helpers";

afterAll(async () => {
  await db.organization.deleteMany({ where: { slug: { startsWith: "t-" } } });
  await db.$disconnect();
});

describe("prevenção de reservas duplicadas", () => {
  it("20 reservas simultâneas no mesmo horário: só 1 é aceita", async () => {
    const ctx = await makeOrg("race");
    const start = new Date("2027-03-10T13:00:00Z");
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => db.booking.create({ data: bookingData(ctx, start) })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.booking.count({ where: { staffId: ctx.staff.id } })).toBe(1);
  });

  it("recusa horários que se sobrepõem parcialmente", async () => {
    const ctx = await makeOrg("partial");
    await db.booking.create({ data: bookingData(ctx, new Date("2027-03-10T13:00:00Z")) });
    await expect(db.booking.create({ data: bookingData(ctx, new Date("2027-03-10T13:15:00Z")) })).rejects.toThrow();
  });

  it("aceita horários consecutivos (fim == início)", async () => {
    const ctx = await makeOrg("adjacent");
    await db.booking.create({ data: bookingData(ctx, new Date("2027-03-10T13:00:00Z")) });
    await expect(db.booking.create({ data: bookingData(ctx, new Date("2027-03-10T13:30:00Z")) })).resolves.toBeTruthy();
  });

  it("libera o horário depois de cancelar", async () => {
    const ctx = await makeOrg("cancel");
    const start = new Date("2027-03-10T13:00:00Z");
    const first = await db.booking.create({ data: bookingData(ctx, start) });
    await db.booking.update({ where: { id: first.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    await expect(db.booking.create({ data: bookingData(ctx, start) })).resolves.toBeTruthy();
  });

  it("profissionais diferentes podem ter o mesmo horário", async () => {
    const ctx = await makeOrg("twostaff");
    const other = await db.staff.create({ data: { organizationId: ctx.org.id, name: "Outro" } });
    const start = new Date("2027-03-10T13:00:00Z");
    await db.booking.create({ data: bookingData(ctx, start) });
    await expect(
      db.booking.create({ data: { ...bookingData(ctx, start), staffId: other.id } }),
    ).resolves.toBeTruthy();
  });
});
