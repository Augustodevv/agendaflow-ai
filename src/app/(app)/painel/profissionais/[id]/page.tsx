import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, PageHeader } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { requireOrg } from "@/lib/session";
import { formatDate, formatTime, localParts, minuteToHHMM, WEEKDAY_LABELS } from "@/lib/time";
import { listServices } from "@/modules/services/service";
import {
  addTimeBlockAction,
  removeTimeBlockAction,
  renameStaffAction,
  saveAvailabilityAction,
  saveStaffServicesAction,
  toggleStaffAction,
} from "@/modules/staff/actions";
import { getStaff } from "@/modules/staff/service";

export const metadata: Metadata = { title: "Profissional" };

type Rule = { weekday: number; startMinute: number; endMinute: number };

/** Reconstrói o formulário (início, fim e pausa) a partir das regras salvas. */
function dayDefaults(rules: Rule[], weekday: number) {
  const day = rules.filter((r) => r.weekday === weekday).sort((a, b) => a.startMinute - b.startMinute);
  if (day.length === 0) return { enabled: false, start: "09:00", end: "18:00", breakStart: "", breakEnd: "" };
  const first = day[0];
  const last = day[day.length - 1];
  return {
    enabled: true,
    start: minuteToHHMM(first.startMinute),
    end: minuteToHHMM(last.endMinute),
    breakStart: day.length > 1 ? minuteToHHMM(first.endMinute) : "",
    breakEnd: day.length > 1 ? minuteToHHMM(day[1].startMinute) : "",
  };
}

export default async function Page({ params }: PageProps<"/painel/profissionais/[id]">) {
  const { id } = await params;
  const { organization } = await requireOrg();
  const [staff, services] = await Promise.all([getStaff(organization.id, id), listServices(organization.id)]);
  if (!staff) notFound();

  const offered = new Set(staff.services.map((s) => s.serviceId));
  const tz = organization.timezone;
  const today = localParts(new Date(), tz).isoDate;

  return (
    <>
      <Link href="/painel/profissionais" className="text-sm text-muted hover:text-foreground">
        ← Profissionais
      </Link>
      <PageHeader title={staff.name} description={staff.active ? "Disponível para reservas." : "Pausado: não aparece na página de reservas."}>
        <ActionForm action={toggleStaffAction}>
          <input type="hidden" name="id" value={staff.id} />
          <input type="hidden" name="active" value={String(!staff.active)} />
          <SubmitButton variant="ghost" pendingLabel="Aguarde...">
            {staff.active ? "Pausar" : "Reativar"}
          </SubmitButton>
        </ActionForm>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] [&>*]:min-w-0">
        <Card>
          <h2 className="mb-1 font-medium">Jornada semanal</h2>
          <p className="mb-4 text-sm text-muted">Marque os dias de atendimento. A pausa (almoço) é opcional.</p>
          <ActionForm action={saveAvailabilityAction} className="space-y-3">
            <input type="hidden" name="id" value={staff.id} />
            <div className="hidden grid-cols-[7rem_1fr_1fr_1fr_1fr] gap-2 text-xs font-medium text-muted sm:grid">
              <span>Dia</span>
              <span>Início</span>
              <span>Fim</span>
              <span>Pausa de</span>
              <span>até</span>
            </div>
            {WEEKDAY_LABELS.map((label, d) => {
              const v = dayDefaults(staff.availability, d);
              return (
                <fieldset key={d} className="grid grid-cols-2 items-center gap-2 border-b border-border pb-3 last:border-0 sm:grid-cols-[7rem_1fr_1fr_1fr_1fr] sm:border-0 sm:pb-0">
                  <legend className="sr-only">{label}</legend>
                  <label className="col-span-2 flex items-center gap-2 text-sm font-medium sm:col-span-1">
                    <input type="checkbox" name={`d${d}.enabled`} defaultChecked={v.enabled} className="size-4 accent-[var(--brand)]" />
                    {label}
                  </label>
                  {(
                    [
                      ["start", "Início", "início"],
                      ["end", "Fim", "fim"],
                      ["breakStart", "Pausa de", "início da pausa"],
                      ["breakEnd", "Pausa até", "fim da pausa"],
                    ] as const
                  ).map(([key, short, aria]) => (
                    <label key={key} className="space-y-1 sm:space-y-0">
                      <span className="block text-xs text-muted sm:hidden">{short}</span>
                      <input type="time" name={`d${d}.${key}`} defaultValue={v[key]} aria-label={`${label}: ${aria}`} className={inputClass} />
                    </label>
                  ))}
                </fieldset>
              );
            })}
            <SubmitButton>Salvar jornada</SubmitButton>
          </ActionForm>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-medium">Nome</h2>
            <ActionForm action={renameStaffAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={staff.id} />
              <Field id="staff-name" name="name" label="Nome exibido" defaultValue={staff.name} required maxLength={60} className="min-w-40 flex-1" />
              <SubmitButton>Salvar</SubmitButton>
            </ActionForm>
          </Card>

          <Card>
            <h2 className="mb-3 font-medium">Serviços que realiza</h2>
            {services.length === 0 ? (
              <p className="text-sm text-muted">
                Nenhum serviço cadastrado. <Link href="/painel/servicos" className="text-brand underline">Cadastrar</Link>
              </p>
            ) : (
              <ActionForm action={saveStaffServicesAction} className="space-y-3">
                <input type="hidden" name="id" value={staff.id} />
                <ul className="space-y-2">
                  {services.map((s) => (
                    <li key={s.id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={offered.has(s.id)} className="size-4 accent-[var(--brand)]" />
                        {s.name}
                        {!s.active && <span className="text-muted">(pausado)</span>}
                      </label>
                    </li>
                  ))}
                </ul>
                <SubmitButton>Salvar serviços</SubmitButton>
              </ActionForm>
            )}
          </Card>

          <Card>
            <h2 className="mb-1 font-medium">Folgas e bloqueios</h2>
            <p className="mb-3 text-sm text-muted">Horários em que não atende (consulta, folga, compromisso).</p>
            <ActionForm action={addTimeBlockAction} resetOnSuccess className="grid grid-cols-2 gap-2">
              <input type="hidden" name="id" value={staff.id} />
              <Field id="block-date" name="date" label="Data" type="date" min={today} required className="col-span-2" />
              <Field id="block-start" name="start" label="De" type="time" required defaultValue="09:00" />
              <Field id="block-end" name="end" label="Até" type="time" required defaultValue="18:00" />
              <Field id="block-reason" name="reason" label="Motivo (opcional)" maxLength={120} className="col-span-2" />
              <SubmitButton className="col-span-2">Bloquear horário</SubmitButton>
            </ActionForm>
            {staff.timeBlocks.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-border pt-4">
                {staff.timeBlocks.map((b) => (
                  <li key={b.id}>
                    <ActionForm action={removeTimeBlockAction} className="flex items-center justify-between gap-2 text-sm">
                      <input type="hidden" name="blockId" value={b.id} />
                      <span>
                        {formatDate(b.startsAt, tz)}, {formatTime(b.startsAt, tz)}–{formatTime(b.endsAt, tz)}
                        {b.reason && <span className="text-muted"> · {b.reason}</span>}
                      </span>
                      <SubmitButton variant="ghost" pendingLabel="...">
                        Remover
                      </SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
