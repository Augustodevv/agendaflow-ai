import { appUrl } from "@/lib/app-url";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CopyLink } from "@/components/copy-link";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { formatCents } from "@/lib/money";
import { requireOrg } from "@/lib/session";
import { formatDate, formatTime } from "@/lib/time";
import { getDashboard } from "@/modules/dashboard/service";
import { updateOrganizationProfile } from "@/modules/organizations/actions";

export const metadata: Metadata = { title: "Painel" };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export default async function Page() {
  const { organization } = await requireOrg();
  const tz = organization.timezone;
  const data = await getDashboard(organization.id, tz);
  const publicUrl = `${appUrl()}/agendar/${organization.slug}`;
  const steps = [
    { done: data.setup.hasServices, label: "Cadastre seus serviços", href: "/painel/servicos" },
    { done: data.setup.hasStaff, label: "Adicione quem atende", href: "/painel/profissionais" },
    { done: data.setup.hasAvailability, label: "Defina a jornada de trabalho", href: "/painel/profissionais" },
  ];
  const ready = steps.every((s) => s.done);

  return (
    <>
      <PageHeader title="Início" description="Resumo do seu negócio hoje e neste mês." />

      {!ready && (
        <Card className="mb-6 border-brand/40">
          <h2 className="font-medium">Deixe sua página de reservas pronta</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {steps.map((s, i) => (
              <li key={s.label} className="flex items-center gap-2">
                <span aria-hidden className={`grid size-5 place-items-center rounded-full text-xs ${s.done ? "bg-brand text-brand-foreground" : "border border-border text-muted"}`}>
                  {s.done ? "✓" : i + 1}
                </span>
                {s.done ? (
                  <span className="text-muted line-through">{s.label}</span>
                ) : (
                  <Link href={s.href} className="text-brand underline-offset-2 hover:underline">
                    {s.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Hoje" value={String(data.todayBookings)} hint="atendimentos" />
        <Stat label="Faturamento do mês" value={formatCents(data.monthRevenueCents)} hint={`${formatCents(data.monthCompletedCents)} já concluídos`} />
        <Stat label="Faltas (30 dias)" value={data.noShowRate === null ? "—" : `${Math.round(data.noShowRate * 100)}%`} hint="dos atendimentos encerrados" />
        <Stat label="Clientes novos" value={String(data.newCustomers)} hint="neste mês" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Próximos atendimentos</h2>
            <Link href="/painel/agenda" className="text-sm text-brand">
              Ver agenda
            </Link>
          </div>
          {data.upcoming.length === 0 ? (
            <EmptyState title="Nada agendado ainda">Envie o link da sua página para os clientes.</EmptyState>
          ) : (
            <Card className="divide-y divide-border p-0">
              {data.upcoming.map((b) => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="w-24 shrink-0">
                    <p className="font-medium tabular-nums">{formatTime(b.startsAt, tz)}</p>
                    <p className="text-xs text-muted">{formatDate(b.startsAt, tz)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.customer.name}</p>
                    <p className="truncate text-muted">
                      {b.service.name} · {b.staff.name}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <Card>
            <h2 className="font-medium">Sua página de reservas</h2>
            <p className="mt-1 text-sm text-muted">Coloque no Instagram, no Google e no WhatsApp.</p>
            <CopyLink url={publicUrl} />
          </Card>
          <Card>
            <h2 className="mb-3 font-medium">Dados do negócio</h2>
            <ActionForm action={updateOrganizationProfile} className="space-y-3">
              <Field id="org-name" name="name" label="Nome" defaultValue={organization.name} required maxLength={80} />
              <Field id="org-phone" name="phone" label="WhatsApp (opcional)" inputMode="tel" defaultValue={organization.phone ?? ""} placeholder="(11) 91234-5678" hint="Aparece na página de reservas para dúvidas." />
              <SubmitButton>Salvar</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
