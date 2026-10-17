import type { Metadata } from "next";
import Link from "next/link";
import { AiForm } from "@/components/ai-form";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/time";
import { requireOrg } from "@/lib/session";
import { db } from "@/lib/db";
import { messageAction, occupancyAction, summaryAction } from "@/modules/ai/actions";
import { getAiUsage } from "@/modules/ai/quota";
import { isAiConfigured } from "@/modules/ai/service";
import { limitsFor } from "@/modules/billing/plans";

export const metadata: Metadata = { title: "Assistente de IA" };

export default async function Page() {
  const { organization } = await requireOrg();
  const limit = limitsFor(organization.plan).aiRequestsPerMonth;
  const [usage, upcoming] = await Promise.all([
    getAiUsage(organization.id),
    db.booking.findMany({
      where: { organizationId: organization.id, startsAt: { gte: new Date() }, status: { in: ["CONFIRMED", "PENDING"] } },
      orderBy: { startsAt: "asc" },
      take: 20,
      include: { customer: true, service: true },
    }),
  ]);

  return (
    <>
      <PageHeader title="Assistente de IA" description="Textos e leituras dos seus números. A IA usa só os dados reais do seu negócio e não promete resultados." />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <Badge tone="brand">{limit > 0 ? `${usage.requests} de ${limit} gerações usadas neste mês` : "Indisponível no seu plano"}</Badge>
        {limit === 0 && (
          <Link href="/painel/assinatura" className="text-brand underline">
            Ver planos
          </Link>
        )}
        {!isAiConfigured() && <span className="text-muted">A IA ainda não foi configurada neste ambiente.</span>}
      </div>

      <div className="grid gap-6">
        <Card>
          <h2 className="mb-1 font-medium">Resumo dos últimos 30 dias</h2>
          <p className="mb-4 text-sm text-muted">Explica seus indicadores em poucas frases.</p>
          <AiForm action={summaryAction} label="Gerar resumo" />
        </Card>

        <Card>
          <h2 className="mb-1 font-medium">Ideias para ocupar a agenda</h2>
          <p className="mb-4 text-sm text-muted">Sugestões baseadas em quais dias da semana têm mais e menos reservas.</p>
          <AiForm action={occupancyAction} label="Gerar sugestões" />
        </Card>

        <Card>
          <h2 className="mb-1 font-medium">Mensagem para o cliente</h2>
          <p className="mb-4 text-sm text-muted">Confirmação ou convite para reagendar. Só o primeiro nome do cliente é enviado à IA.</p>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Ainda não há reservas futuras para gerar mensagem.</p>
          ) : (
            <AiForm action={messageAction} label="Gerar mensagem">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1.5 text-sm font-medium sm:col-span-3">
                  Reserva
                  <select name="bookingId" required className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm font-normal">
                    {upcoming.map((b) => (
                      <option key={b.id} value={b.id}>
                        {formatDate(b.startsAt, organization.timezone)} {formatTime(b.startsAt, organization.timezone)} · {b.customer.name} · {b.service.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  Tipo
                  <select name="kind" className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm font-normal">
                    <option value="confirmation">Confirmação</option>
                    <option value="reschedule">Reagendamento</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  Tom
                  <select name="tone" className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm font-normal">
                    <option value="amigavel">Amigável</option>
                    <option value="formal">Formal</option>
                  </select>
                </label>
              </div>
            </AiForm>
          )}
        </Card>
      </div>
    </>
  );
}
