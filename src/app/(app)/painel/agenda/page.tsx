import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import { requireOrg } from "@/lib/session";
import { addDays, formatIsoDate, formatTime, isIsoDate, localParts } from "@/lib/time";
import { updateBookingStatusAction } from "@/modules/bookings/actions";
import { STATUS_LABELS } from "@/modules/bookings/schema";
import { listBookingsForDay } from "@/modules/bookings/service";
import { listStaff } from "@/modules/staff/service";

export const metadata: Metadata = { title: "Agenda" };

const TONE = { PENDING: "neutral", CONFIRMED: "brand", COMPLETED: "muted", CANCELLED: "danger", NO_SHOW: "danger" } as const;

function StatusButton({ id, status, label }: { id: string; status: string; label: string }) {
  return (
    <ActionForm action={updateBookingStatusAction} confirmMessage={status === "CANCELLED" ? "Cancelar este agendamento?" : undefined}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant="ghost" pendingLabel="..." className="h-8 px-3 text-xs">
        {label}
      </SubmitButton>
    </ActionForm>
  );
}

export default async function Page({ searchParams }: PageProps<"/painel/agenda">) {
  const { organization } = await requireOrg();
  const sp = await searchParams;
  const tz = organization.timezone;
  const today = localParts(new Date(), tz).isoDate;
  const date = isIsoDate(sp.data) ? sp.data : today;
  const staffId = typeof sp.profissional === "string" ? sp.profissional : undefined;

  const [bookings, staff] = await Promise.all([listBookingsForDay(organization.id, tz, date, staffId), listStaff(organization.id)]);
  const active = bookings.filter((b) => b.status !== "CANCELLED");
  const expected = active.reduce((sum, b) => sum + (b.status === "NO_SHOW" ? 0 : b.priceCents), 0);
  const href = (d: string, s = staffId) => `/painel/agenda?data=${d}${s ? `&profissional=${s}` : ""}`;
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Agenda"
        description={`${formatIsoDate(date, { weekday: "long", day: "2-digit", month: "long" })} · ${active.length} ${active.length === 1 ? "atendimento" : "atendimentos"} · ${formatCents(expected)} previstos`}
      >
        <div className="flex items-center gap-1">
          <Link href={href(addDays(date, -1))} className="inline-flex h-10 items-center rounded-lg border border-border px-3 text-sm hover:bg-card" aria-label="Dia anterior">
            ←
          </Link>
          <Link href={href(today)} className="inline-flex h-10 items-center rounded-lg border border-border px-3 text-sm hover:bg-card">
            Hoje
          </Link>
          <Link href={href(addDays(date, 1))} className="inline-flex h-10 items-center rounded-lg border border-border px-3 text-sm hover:bg-card" aria-label="Próximo dia">
            →
          </Link>
          <form action="/painel/agenda" className="ml-1">
            {staffId && <input type="hidden" name="profissional" value={staffId} />}
            <label className="sr-only" htmlFor="agenda-date">Ir para data</label>
            <input id="agenda-date" type="date" name="data" defaultValue={date} className="h-10 rounded-lg border border-border bg-card px-2 text-sm" />
            <button type="submit" className="sr-only">Ir</button>
          </form>
        </div>
      </PageHeader>

      {staff.length > 1 && (
        <nav aria-label="Filtrar por profissional" className="mb-4 flex flex-wrap gap-2">
          {[{ id: undefined, name: "Todos" }, ...staff].map((s) => (
            <Link
              key={s.id ?? "all"}
              href={href(date, s.id)}
              aria-current={staffId === s.id ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-sm ${staffId === s.id ? "border-brand bg-brand/10 text-brand" : "border-border text-muted hover:text-foreground"}`}
            >
              {s.name}
            </Link>
          ))}
        </nav>
      )}

      {bookings.length === 0 ? (
        <EmptyState title="Nenhum agendamento neste dia">
          Compartilhe sua página: <code className="text-foreground">/agendar/{organization.slug}</code>
        </EmptyState>
      ) : (
        <ol className="space-y-3">
          {bookings.map((b) => {
            const past = b.endsAt < now;
            const open = b.status === "CONFIRMED" || b.status === "PENDING";
            return (
              <li key={b.id}>
                <Card className={`flex flex-wrap items-center gap-4 ${b.status === "CANCELLED" ? "opacity-60" : ""}`}>
                  <div className="w-20 shrink-0 tabular-nums">
                    <p className="text-lg font-semibold">{formatTime(b.startsAt, tz)}</p>
                    <p className="text-xs text-muted">até {formatTime(b.endsAt, tz)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {b.customer.name} <Badge tone={TONE[b.status]}>{STATUS_LABELS[b.status]}</Badge>
                    </p>
                    <p className="text-sm text-muted">
                      {b.service.name} · {b.staff.name} · {formatCents(b.priceCents)}
                    </p>
                    <a href={`https://wa.me/55${b.customer.phone}`} target="_blank" rel="noopener noreferrer" className="text-sm text-brand underline-offset-2 hover:underline">
                      WhatsApp {b.customer.phone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3")}
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {open && past && <StatusButton id={b.id} status="COMPLETED" label="Concluir" />}
                    {open && past && <StatusButton id={b.id} status="NO_SHOW" label="Faltou" />}
                    {open && <StatusButton id={b.id} status="CANCELLED" label="Cancelar" />}
                    {!open && !past && <StatusButton id={b.id} status="CONFIRMED" label="Reativar" />}
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
