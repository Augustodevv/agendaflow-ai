import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { PlanTable } from "@/components/plan-table";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import { requireOrg } from "@/lib/session";
import { db } from "@/lib/db";
import { checkoutAction, portalAction } from "@/modules/billing/actions";
import { isBillingEnabled, PAID_PLANS, PLANS } from "@/modules/billing/plans";

export const metadata: Metadata = { title: "Assinatura" };

const STATUS_LABEL = {
  ACTIVE: "Ativa",
  TRIALING: "Em teste",
  PAST_DUE: "Pagamento pendente",
  CANCELED: "Cancelada",
  INCOMPLETE: "Aguardando pagamento",
} as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { organization } = await requireOrg();
  const { status } = await searchParams;
  const subscription = await db.subscription.findUnique({ where: { organizationId: organization.id } });
  const billing = isBillingEnabled();

  return (
    <>
      <PageHeader title="Assinatura" description="Seu plano, forma de pagamento e cancelamento." />

      {status === "ok" && (
        <p role="status" className="mb-4 rounded-lg border border-border bg-card p-3 text-sm">
          Pagamento enviado. Seu plano é atualizado assim que o Stripe confirmar (costuma levar alguns segundos).
        </p>
      )}
      {status === "cancelado" && (
        <p role="status" className="mb-4 rounded-lg border border-border bg-card p-3 text-sm">
          Pagamento cancelado. Nada foi cobrado.
        </p>
      )}
      {subscription?.status === "PAST_DUE" && (
        <p role="alert" className="mb-4 rounded-lg border border-danger p-3 text-sm text-danger">
          Não conseguimos cobrar sua última fatura. Atualize a forma de pagamento para não perder seu plano.
        </p>
      )}

      <Card className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-medium">Plano atual: {PLANS[organization.plan].name}</h2>
          {subscription && <Badge tone={subscription.status === "ACTIVE" ? "brand" : "danger"}>{STATUS_LABEL[subscription.status]}</Badge>}
        </div>
        {subscription?.currentPeriodEnd && (
          <p className="mt-2 text-sm text-muted">
            {subscription.cancelAtPeriodEnd ? "Termina em " : "Renova em "}
            {subscription.currentPeriodEnd.toLocaleDateString("pt-BR", { timeZone: organization.timezone })}.
          </p>
        )}
        {!billing && (
          <p className="mt-2 text-sm text-muted">
            A cobrança ainda não está ativa: durante o lançamento, o uso é gratuito e sem limite de profissionais.
          </p>
        )}
        {organization.stripeCustomerId && billing && (
          <ActionForm action={portalAction} className="mt-4">
            <SubmitButton variant="ghost" pendingLabel="Abrindo...">
              Gerenciar pagamento e cancelar
            </SubmitButton>
          </ActionForm>
        )}
      </Card>

      {billing && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {PAID_PLANS.map((id) => (
            <Card key={id}>
              <h3 className="font-medium">{PLANS[id].name}</h3>
              <p className="text-2xl font-semibold">
                {formatCents(PLANS[id].priceCents)}
                <span className="text-sm font-normal text-muted">/mês</span>
              </p>
              <p className="mb-4 text-sm text-muted">{PLANS[id].tagline}</p>
              {organization.plan === id ? (
                <Badge tone="brand">Seu plano</Badge>
              ) : (
                <ActionForm action={checkoutAction}>
                  <input type="hidden" name="plan" value={id} />
                  <SubmitButton pendingLabel="Abrindo...">{organization.plan === "FREE" ? "Assinar" : "Trocar para este"}</SubmitButton>
                </ActionForm>
              )}
            </Card>
          ))}
        </div>
      )}

      <PlanTable />
    </>
  );
}
