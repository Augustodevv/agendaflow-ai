import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hit } from "@/lib/rate-limit";
import { cancelByCustomer, getBookingByToken } from "@/modules/bookings/service";
import type { ReminderData } from "@/modules/notifications/messages";
import { sendDueReminders } from "@/modules/notifications/reminders";
import { bookingData, makeOrg } from "./helpers";

// Datas bem no futuro para não colidir com reservas reais do banco de desenvolvimento.
const NOW = new Date("2031-05-10T12:00:00Z");
const inHours = (h: number) => new Date(NOW.getTime() + h * 3_600_000);

afterAll(async () => {
  await db.organization.deleteMany({ where: { slug: { startsWith: "t-" } } });
  await db.rateLimitHit.deleteMany({ where: { key: { startsWith: "t-" } } });
  await db.$disconnect();
});

function fakeSender(ok = true) {
  const calls: ReminderData[] = [];
  const send = async (d: ReminderData) => {
    calls.push(d);
    return ok ? ({ sent: true } as const) : ({ sent: false, reason: "falhou" } as const);
  };
  return { calls, send };
}

describe("lembretes", () => {
  it("envia uma vez só para reservas confirmadas nas próximas 24h", async () => {
    const ctx = await makeOrg("rem");
    const soon = await db.booking.create({ data: bookingData(ctx, inHours(3)) });
    await db.booking.create({ data: bookingData(ctx, inHours(30)) }); // longe demais
    await db.booking.create({ data: { ...bookingData(ctx, inHours(5)), status: "CANCELLED" } });

    const { calls, send } = fakeSender();
    await sendDueReminders({ now: NOW, send });
    const mine = calls.filter((c) => c.businessName === ctx.org.name);
    expect(mine).toHaveLength(1);
    expect(mine[0].manageUrl).toContain(`/agendar/${ctx.org.slug}/reserva/${soon.manageToken}`);

    // Segunda rodada não repete.
    const again = fakeSender();
    await sendDueReminders({ now: NOW, send: again.send });
    expect(again.calls.filter((c) => c.businessName === ctx.org.name)).toHaveLength(0);
  });

  it("se o envio falhar, tenta de novo na próxima rodada", async () => {
    const ctx = await makeOrg("remfail");
    const b = await db.booking.create({ data: bookingData(ctx, inHours(2)) });
    await sendDueReminders({ now: NOW, send: fakeSender(false).send });
    expect((await db.booking.findUnique({ where: { id: b.id } }))?.reminderSentAt).toBeNull();
    await sendDueReminders({ now: NOW, send: fakeSender(true).send });
    expect((await db.booking.findUnique({ where: { id: b.id } }))?.reminderSentAt).not.toBeNull();
  });

  it("duas rodadas simultâneas não mandam lembrete duplicado", async () => {
    const ctx = await makeOrg("remrace");
    await db.booking.create({ data: bookingData(ctx, inHours(4)) });
    const a = fakeSender();
    const b = fakeSender();
    await Promise.all([sendDueReminders({ now: NOW, send: a.send }), sendDueReminders({ now: NOW, send: b.send })]);
    const total = [...a.calls, ...b.calls].filter((c) => c.businessName === ctx.org.name);
    expect(total).toHaveLength(1);
  });
});

describe("cancelamento pelo cliente", () => {
  it("cancela pelo link secreto e libera o horário", async () => {
    const ctx = await makeOrg("custcancel");
    const b = await db.booking.create({ data: bookingData(ctx, inHours(10)) });
    expect(await cancelByCustomer(ctx.org.slug, "token-errado", NOW)).toBe(false);
    expect(await cancelByCustomer(ctx.org.slug, b.manageToken, NOW)).toBe(true);
    expect((await getBookingByToken(ctx.org.slug, b.manageToken))?.status).toBe("CANCELLED");
    // Horário liberado: outra reserva entra no mesmo lugar.
    await expect(db.booking.create({ data: bookingData(ctx, inHours(10)) })).resolves.toBeTruthy();
  });

  it("não cancela horário que já passou nem por slug de outra empresa", async () => {
    const ctx = await makeOrg("custpast");
    const other = await makeOrg("custother");
    const past = await db.booking.create({ data: bookingData(ctx, inHours(-2)) });
    const future = await db.booking.create({ data: bookingData(ctx, inHours(20)) });
    expect(await cancelByCustomer(ctx.org.slug, past.manageToken, NOW)).toBe(false);
    expect(await cancelByCustomer(other.org.slug, future.manageToken, NOW)).toBe(false);
  });

  it("cada reserva tem um link diferente", async () => {
    const ctx = await makeOrg("tokens");
    const a = await db.booking.create({ data: bookingData(ctx, inHours(1)) });
    const b = await db.booking.create({ data: bookingData(ctx, inHours(2)) });
    expect(a.manageToken).not.toBe(b.manageToken);
    expect(a.manageToken.length).toBeGreaterThanOrEqual(32);
  });
});

describe("limite de tentativas", () => {
  it("bloqueia depois do limite e libera quando a janela passa", async () => {
    const key = `t-rl-${Date.now()}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await hit(key, 3, 60_000, NOW));
    expect(results).toEqual([true, true, true, false]);
    expect(await hit(key, 3, 60_000, new Date(NOW.getTime() + 61_000))).toBe(true);
  });
});
