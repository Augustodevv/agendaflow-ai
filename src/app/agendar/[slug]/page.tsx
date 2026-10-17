// Página pública: depende do horário atual e do banco, então renderiza a cada requisição.
export const instant = false;

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { addDays, formatIsoDate, formatTime, isIsoDate, localParts } from "@/lib/time";
import { eligibleStaff, getDaySlots } from "@/modules/availability/service";
import { listServices } from "@/modules/services/service";
import { BookingForm } from "./booking-form";

const DAYS_AHEAD = 21;

async function getOrg(slug: string) {
  return db.organization.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }: PageProps<"/agendar/[slug]">): Promise<Metadata> {
  const org = await getOrg((await params).slug);
  return org ? { title: `Agendar em ${org.name}`, description: `Reserve seu horário em ${org.name} pelo celular.` } : {};
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-medium">
        <span className="grid size-6 place-items-center rounded-full bg-brand text-xs text-brand-foreground">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const pill = (active: boolean) =>
  `rounded-lg border px-3 py-2 text-sm transition ${active ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card hover:border-brand"}`;

export default async function Page({ params, searchParams }: PageProps<"/agendar/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const org = await getOrg(slug);
  if (!org) notFound();

  const tz = org.timezone;
  const services = await listServices(org.id, true);
  const service = services.find((s) => s.id === sp.servico);
  const staff = service ? await eligibleStaff(org.id, service.id) : [];
  const chosenStaff = staff.find((s) => s.id === sp.profissional);
  const today = localParts(new Date(), tz).isoDate;
  const lastDay = addDays(today, DAYS_AHEAD - 1);
  const date = isIsoDate(sp.data) && sp.data >= today && sp.data <= lastDay ? sp.data : today;

  const slots = service
    ? await getDaySlots({ organizationId: org.id, timezone: tz, serviceId: service.id, durationMinutes: service.durationMinutes, staffId: chosenStaff?.id, isoDate: date })
    : [];
  const chosenSlot = slots.find((s) => s.startsAt.toISOString() === sp.horario);

  const link = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { servico: service?.id, profissional: chosenStaff?.id, data: date, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    return `/agendar/${slug}?${q}`;
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8">
      <header className="mb-8 space-y-1">
        <p className="text-sm text-muted">Agendamento online</p>
        <h1 className="text-3xl font-semibold tracking-tight">{org.name}</h1>
        {org.phone && (
          <a href={`https://wa.me/55${org.phone}`} target="_blank" rel="noopener noreferrer" className="text-sm text-brand">
            Dúvidas? Fale no WhatsApp
          </a>
        )}
      </header>

      {services.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted">Este negócio ainda não abriu a agenda online.</p>
      ) : (
        <div className="space-y-8">
          <Step n={1} title="Escolha o serviço">
            <ul className="grid gap-2">
              {services.map((s) => (
                <li key={s.id}>
                  <Link
                    href={link({ servico: s.id, profissional: undefined, horario: undefined })}
                    aria-current={s.id === service?.id ? "true" : undefined}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition ${s.id === service?.id ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-border bg-card hover:border-brand"}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{s.name}</span>
                      <span className="block text-sm text-muted">
                        {s.durationMinutes} min{s.description && ` · ${s.description}`}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{formatCents(s.priceCents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Step>

          {service && staff.length === 0 && <p className="text-sm text-muted">Nenhum profissional atende este serviço no momento.</p>}

          {service && staff.length > 1 && (
            <Step n={2} title="Com quem?">
              <div className="flex flex-wrap gap-2">
                <Link href={link({ profissional: undefined, horario: undefined })} className={pill(!chosenStaff)}>
                  Sem preferência
                </Link>
                {staff.map((s) => (
                  <Link key={s.id} href={link({ profissional: s.id, horario: undefined })} className={pill(chosenStaff?.id === s.id)}>
                    {s.name}
                  </Link>
                ))}
              </div>
            </Step>
          )}

          {service && staff.length > 0 && (
            <Step n={staff.length > 1 ? 3 : 2} title="Dia e horário">
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)).map((d) => (
                  <Link key={d} href={link({ data: d, horario: undefined })} className={`${pill(d === date)} shrink-0 text-center`} aria-current={d === date ? "date" : undefined}>
                    <span className="block text-xs capitalize opacity-80">{i18nWeekday(d, today)}</span>
                    <span className="block font-medium">{formatIsoDate(d, { day: "2-digit", month: "2-digit" })}</span>
                  </Link>
                ))}
              </div>
              {slots.length === 0 ? (
                <p className="text-sm text-muted">Sem horários livres neste dia. Tente outra data.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {slots.map((s) => (
                    <Link key={s.startsAt.toISOString()} href={link({ horario: s.startsAt.toISOString() })} className={`${pill(s === chosenSlot)} text-center tabular-nums`}>
                      {formatTime(s.startsAt, tz)}
                    </Link>
                  ))}
                </div>
              )}
            </Step>
          )}

          {service && chosenSlot && (
            <Step n={staff.length > 1 ? 4 : 3} title="Seus dados">
              <div className="rounded-xl bg-brand/5 p-4 text-sm">
                <p className="font-medium">
                  {service.name} · {formatCents(service.priceCents)}
                </p>
                <p className="text-muted">
                  {formatIsoDate(date, { weekday: "long", day: "2-digit", month: "long" })} às {formatTime(chosenSlot.startsAt, tz)}
                  {chosenStaff && ` com ${chosenStaff.name}`}
                </p>
              </div>
              <BookingForm slug={slug} serviceId={service.id} staffId={chosenStaff?.id} startsAt={chosenSlot.startsAt.toISOString()} orgName={org.name} />
            </Step>
          )}
        </div>
      )}

      <footer className="mt-12 text-center text-xs text-muted">
        Agenda por <Link href="/" className="underline">AgendaFlow AI</Link>
      </footer>
    </main>
  );
}

function i18nWeekday(isoDate: string, today: string) {
  if (isoDate === today) return "hoje";
  if (isoDate === addDays(today, 1)) return "amanhã";
  return formatIsoDate(isoDate, { weekday: "short" }).replace(".", "");
}
