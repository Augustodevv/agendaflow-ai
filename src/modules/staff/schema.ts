import { z } from "zod";
import { hhmmToMinute, zonedToUtc } from "@/lib/time";

export const staffNameSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do profissional").max(60),
});

export type DayInput = { enabled: boolean; start: string; end: string; breakStart: string; breakEnd: string };

/**
 * Converte a jornada semanal do formulário em regras (minutos desde 00:00).
 * Uma pausa (almoço) divide o dia em dois intervalos.
 */
export function parseWeek(days: DayInput[]): { rules: { weekday: number; startMinute: number; endMinute: number }[] } | { error: string } {
  const rules: { weekday: number; startMinute: number; endMinute: number }[] = [];
  for (const [weekday, day] of days.entries()) {
    if (!day.enabled) continue;
    const start = hhmmToMinute(day.start);
    const end = hhmmToMinute(day.end);
    if (start === null || end === null || end <= start) return { error: "Confira início e fim da jornada em cada dia marcado." };
    if (!day.breakStart && !day.breakEnd) {
      rules.push({ weekday, startMinute: start, endMinute: end });
      continue;
    }
    const bStart = hhmmToMinute(day.breakStart);
    const bEnd = hhmmToMinute(day.breakEnd);
    if (bStart === null || bEnd === null || bEnd <= bStart || bStart <= start || bEnd >= end) {
      return { error: "A pausa precisa ficar dentro da jornada (ex.: 12:00 às 13:00)." };
    }
    rules.push({ weekday, startMinute: start, endMinute: bStart }, { weekday, startMinute: bEnd, endMinute: end });
  }
  return { rules };
}

export const timeBlockSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data"),
    start: z.string(),
    end: z.string(),
    reason: z.string().trim().max(120).optional(),
  })
  .transform((v, ctx) => {
    const start = hhmmToMinute(v.start);
    const end = hhmmToMinute(v.end);
    if (start === null || end === null || end <= start) {
      ctx.addIssue({ code: "custom", message: "O fim do bloqueio precisa ser depois do início." });
      return z.NEVER;
    }
    return { ...v, startMinute: start, endMinute: end };
  });

export function blockToInterval(b: { date: string; startMinute: number; endMinute: number }, timezone: string) {
  return { startsAt: zonedToUtc(b.date, b.startMinute, timezone), endsAt: zonedToUtc(b.date, b.endMinute, timezone) };
}
