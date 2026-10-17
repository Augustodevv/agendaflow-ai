import type Stripe from "stripe";
import type { Plan, SubscriptionStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { planFromPriceId } from "./plans";
import { getStripe } from "./stripe";

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  unpaid: "PAST_DUE",
  canceled: "CANCELED",
  incomplete_expired: "CANCELED",
  incomplete: "INCOMPLETE",
  paused: "CANCELED",
};

/** Plano que a organização realmente tem direito de usar, dado o status da assinatura. */
export function entitledPlan(plan: Plan, status: SubscriptionStatus): Plan {
  // PAST_DUE mantém o plano (carência enquanto o Stripe tenta cobrar de novo).
  return status === "ACTIVE" || status === "TRIALING" || status === "PAST_DUE" ? plan : "FREE";
}

type Tx = Pick<typeof db, "organization" | "subscription">;

/** Copia o estado de uma assinatura do Stripe para o nosso banco e ajusta o plano da organização. */
export async function syncSubscription(sub: Stripe.Subscription, tx: Tx = db) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const byMetadata = sub.metadata?.organizationId
    ? await tx.organization.findUnique({ where: { id: sub.metadata.organizationId } })
    : null;
  const org = byMetadata ?? (await tx.organization.findUnique({ where: { stripeCustomerId: customerId } }));
  if (!org) throw new Error(`Assinatura ${sub.id} sem organização correspondente.`);

  const item = sub.items.data[0];
  const plan = planFromPriceId(item?.price.id) ?? (sub.metadata?.plan as Plan | undefined);
  if (!plan || plan === "FREE") throw new Error(`Assinatura ${sub.id} com plano desconhecido.`);
  const status = STATUS_MAP[sub.status] ?? "INCOMPLETE";
  const currentPeriodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;

  await tx.subscription.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      stripeSubscriptionId: sub.id,
      plan,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: { stripeSubscriptionId: sub.id, plan, status, currentPeriodEnd, cancelAtPeriodEnd: sub.cancel_at_period_end },
  });
  await tx.organization.update({
    where: { id: org.id },
    data: { plan: entitledPlan(plan, status), stripeCustomerId: customerId },
  });
}

/**
 * Processa um evento do Stripe uma única vez.
 * O registro do evento e a atualização acontecem na mesma transação: se algo falhar,
 * nada é salvo e o Stripe tenta de novo. Evento repetido é ignorado.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<"processed" | "duplicate" | "ignored"> {
  return db.$transaction(async (tx) => {
    // ON CONFLICT DO NOTHING: só o próprio id do evento conta como duplicado.
    // Outros erros (ex.: chave única em Subscription) não são engolidos e fazem o Stripe reenviar.
    const claimed = await tx.webhookEvent.createMany({ data: [{ id: event.id, type: event.type }], skipDuplicates: true });
    if (claimed.count === 0) return "duplicate" as const;

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription, tx);
        return "processed" as const;
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.client_reference_id;
        const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (orgId && customer) {
          await tx.organization.update({ where: { id: orgId }, data: { stripeCustomerId: customer } });
        }
        return "processed" as const;
      }
      default:
        return "ignored" as const;
    }
  });
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

/** Cria a sessão de pagamento do Stripe (página hospedada pelo Stripe: não tocamos em dados de cartão). */
export async function createCheckoutUrl(
  org: { id: string; stripeCustomerId: string | null },
  email: string,
  priceId: string,
  plan: Plan,
) {
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: org.id,
    ...(org.stripeCustomerId ? { customer: org.stripeCustomerId } : { customer_email: email }),
    subscription_data: { metadata: { organizationId: org.id, plan } },
    locale: "pt-BR",
    success_url: `${appUrl()}/painel/assinatura?status=ok`,
    cancel_url: `${appUrl()}/painel/assinatura?status=cancelado`,
  });
  if (!session.url) throw new Error("Stripe não retornou a URL de pagamento.");
  return session.url;
}

/** Portal do Stripe: o cliente troca cartão, vê faturas e cancela sozinho. */
export async function createPortalUrl(stripeCustomerId: string) {
  const session = await getStripe().billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${appUrl()}/painel/assinatura`,
  });
  return session.url;
}
