// Datas: o banco guarda UTC; a organização tem um fuso (ex.: America/Sao_Paulo).
// Sem dependências: usa Intl para converter entre "hora de parede" no fuso e UTC.

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function partsIn(date: Date, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: WEEKDAYS[p.weekday],
  };
}

/** Diferença (ms) entre a hora local no fuso e UTC naquele instante. */
function offsetMs(date: Date, timeZone: string): number {
  const p = partsIn(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(date.getTime() / 60_000) * 60_000;
}

/** "2027-03-10" + 540 minutos (09:00) no fuso -> instante UTC. */
export function zonedToUtc(isoDate: string, minuteOfDay: number, timeZone: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minuteOfDay);
  const first = guess - offsetMs(new Date(guess), timeZone);
  // Segunda passada corrige transições de horário de verão.
  return new Date(guess - offsetMs(new Date(first), timeZone));
}

/** Data local (YYYY-MM-DD), dia da semana e minuto do dia de um instante no fuso. */
export function localParts(date: Date, timeZone: string) {
  const p = partsIn(date, timeZone);
  const isoDate = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  return { isoDate, weekday: p.weekday, minuteOfDay: p.hour * 60 + p.minute };
}

/** Dia da semana (0 = domingo) de uma data YYYY-MM-DD. */
export function weekdayOf(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/** 540 -> "09:00" */
export function minuteToHHMM(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

/** "09:00" -> 540; retorna null se inválido. */
export function hhmmToMinute(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, weekday: "short", day: "2-digit", month: "short" }).format(date);
}

/** Formata uma data YYYY-MM-DD sem depender do fuso do servidor. */
export function formatIsoDate(isoDate: string, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "2-digit", month: "short" }): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
