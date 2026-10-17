import { weekdayOf, zonedToUtc } from "@/lib/time";

export type Interval = { startsAt: Date; endsAt: Date };
export type Rule = { weekday: number; startMinute: number; endMinute: number };

export type SlotInput = {
  isoDate: string;
  timezone: string;
  durationMinutes: number;
  rules: Rule[];
  /** Reservas ativas e bloqueios do profissional. */
  busy: Interval[];
  now: Date;
  stepMinutes?: number;
  /** Antecedência mínima para reservar. */
  minNoticeMinutes?: number;
};

const overlaps = (a: Interval, b: Interval) => a.startsAt < b.endsAt && b.startsAt < a.endsAt;

/**
 * Horários livres de um profissional num dia. Função pura: recebe tudo pronto e
 * devolve os inícios possíveis em UTC. O banco continua sendo a garantia final.
 */
export function computeSlots(input: SlotInput): Date[] {
  const { isoDate, timezone, durationMinutes, rules, busy, now } = input;
  const step = input.stepMinutes ?? 15;
  const earliest = new Date(now.getTime() + (input.minNoticeMinutes ?? 60) * 60_000);
  const weekday = weekdayOf(isoDate);
  const slots: Date[] = [];

  for (const rule of rules.filter((r) => r.weekday === weekday)) {
    for (let minute = rule.startMinute; minute + durationMinutes <= rule.endMinute; minute += step) {
      const startsAt = zonedToUtc(isoDate, minute, timezone);
      const slot = { startsAt, endsAt: new Date(startsAt.getTime() + durationMinutes * 60_000) };
      if (startsAt < earliest) continue;
      if (busy.some((b) => overlaps(slot, b))) continue;
      slots.push(startsAt);
    }
  }

  return [...new Map(slots.map((s) => [s.getTime(), s])).values()].sort((a, b) => a.getTime() - b.getTime());
}
