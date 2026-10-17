import { describe, expect, it } from "vitest";
import { computeSlots } from "@/modules/availability/slots";
import { hhmmToMinute, localParts, zonedToUtc } from "@/lib/time";
import { parseBRL } from "@/lib/money";

const TZ = "America/Sao_Paulo";
// 2027-03-10 é quarta-feira (weekday 3). São Paulo = UTC-3.
const DAY = "2027-03-10";
const rules = [{ weekday: 3, startMinute: 9 * 60, endMinute: 12 * 60 }];
const longAgo = new Date("2027-01-01T00:00:00Z");
const hhmm = (d: Date) => localParts(d, TZ).minuteOfDay;

describe("fuso horário", () => {
  it("converte hora local de São Paulo para UTC", () => {
    expect(zonedToUtc(DAY, 9 * 60, TZ).toISOString()).toBe("2027-03-10T12:00:00.000Z");
  });

  it("respeita horário de verão em outros fusos", () => {
    // Nova York: 10/03/2027 ainda é EST (UTC-5); 15/03/2027 já é EDT (UTC-4).
    expect(zonedToUtc("2027-03-10", 9 * 60, "America/New_York").toISOString()).toBe("2027-03-10T14:00:00.000Z");
    expect(zonedToUtc("2027-03-15", 9 * 60, "America/New_York").toISOString()).toBe("2027-03-15T13:00:00.000Z");
  });

  it("lê HH:MM", () => {
    expect(hhmmToMinute("09:30")).toBe(570);
    expect(hhmmToMinute("24:00")).toBeNull();
  });

  it("lê valores em reais", () => {
    expect(parseBRL("45")).toBe(4500);
    expect(parseBRL("1.234,50")).toBe(123450);
    expect(parseBRL("abc")).toBeNull();
  });
});

describe("cálculo de horários livres", () => {
  it("gera horários dentro da jornada, sem passar do fim", () => {
    const slots = computeSlots({ isoDate: DAY, timezone: TZ, durationMinutes: 30, rules, busy: [], now: longAgo, stepMinutes: 30 });
    expect(slots.map(hhmm)).toEqual([540, 570, 600, 630, 660, 690]);
  });

  it("não oferece horário em dia sem jornada", () => {
    expect(computeSlots({ isoDate: "2027-03-11", timezone: TZ, durationMinutes: 30, rules, busy: [], now: longAgo })).toEqual([]);
  });

  it("remove horários que colidem com reservas e bloqueios", () => {
    const busy = [{ startsAt: zonedToUtc(DAY, 600, TZ), endsAt: zonedToUtc(DAY, 630, TZ) }];
    const slots = computeSlots({ isoDate: DAY, timezone: TZ, durationMinutes: 30, rules, busy, now: longAgo, stepMinutes: 15 });
    const minutes = slots.map(hhmm);
    expect(minutes).not.toContain(585); // 09:45-10:15 colide
    expect(minutes).not.toContain(600);
    expect(minutes).not.toContain(615);
    expect(minutes).toContain(570); // 09:30-10:00 encosta, mas não colide
    expect(minutes).toContain(630);
  });

  it("respeita a antecedência mínima", () => {
    const now = zonedToUtc(DAY, 9 * 60 + 10, TZ);
    const slots = computeSlots({ isoDate: DAY, timezone: TZ, durationMinutes: 30, rules, busy: [], now, stepMinutes: 30, minNoticeMinutes: 60 });
    expect(slots.map(hhmm)[0]).toBe(630);
  });

  it("junta jornadas partidas (manhã e tarde) sem duplicar", () => {
    const split = [...rules, { weekday: 3, startMinute: 14 * 60, endMinute: 15 * 60 }];
    const slots = computeSlots({ isoDate: DAY, timezone: TZ, durationMinutes: 60, rules: split, busy: [], now: longAgo, stepMinutes: 60 });
    expect(slots.map(hhmm)).toEqual([540, 600, 660, 840]);
  });
});
