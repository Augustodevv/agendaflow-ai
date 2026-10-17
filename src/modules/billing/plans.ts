import type { Plan } from "@/generated/prisma/client";

export type PlanLimits = {
  /** Profissionais ativos permitidos. */
  maxStaff: number;
  /** Chamadas de IA por mês. 0 = recurso indisponível no plano. */
  aiRequestsPerMonth: number;
  /** Lembretes automáticos por WhatsApp (o botão manual existe em todos os planos). */
  autoReminders: boolean;
};

export type PlanInfo = {
  id: Plan;
  name: string;
  /** Preço mensal em centavos. É uma hipótese inicial: ajuste aqui. O valor cobrado é o do Price no Stripe. */
  priceCents: number;
  tagline: string;
  limits: PlanLimits;
};

/** Fonte única de verdade dos planos. Preços e limites são configuráveis neste arquivo. */
export const PLANS: Record<Plan, PlanInfo> = {
  FREE: {
    id: "FREE",
    name: "Grátis",
    priceCents: 0,
    tagline: "Para conhecer",
    limits: { maxStaff: 1, aiRequestsPerMonth: 0, autoReminders: false },
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    priceCents: 3900,
    tagline: "Para quem trabalha sozinho ou em dupla",
    limits: { maxStaff: 2, aiRequestsPerMonth: 20, autoReminders: false },
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceCents: 7900,
    tagline: "Para barbearias em crescimento",
    limits: { maxStaff: 5, aiRequestsPerMonth: 100, autoReminders: true },
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "Business",
    priceCents: 14900,
    tagline: "Para equipes maiores",
    limits: { maxStaff: 15, aiRequestsPerMonth: 500, autoReminders: true },
  },
};

export const PAID_PLANS = ["STARTER", "PRO", "BUSINESS"] as const satisfies readonly Plan[];
export type PaidPlan = (typeof PAID_PLANS)[number];

export const isPaidPlan = (value: unknown): value is PaidPlan => PAID_PLANS.includes(value as PaidPlan);

/** ID do Price do Stripe de cada plano (criados no painel do Stripe, modo teste primeiro). */
export function stripePriceId(plan: PaidPlan): string | undefined {
  return (
    {
      STARTER: process.env.STRIPE_PRICE_STARTER,
      PRO: process.env.STRIPE_PRICE_PRO,
      BUSINESS: process.env.STRIPE_PRICE_BUSINESS,
    }[plan] || undefined
  );
}

export function planFromPriceId(priceId: string | undefined | null): PaidPlan | null {
  if (!priceId) return null;
  return PAID_PLANS.find((p) => stripePriceId(p) === priceId) ?? null;
}

/** Cobrança só existe quando o Stripe está configurado. */
export const isBillingEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * Limites efetivos de uma organização.
 * Sem Stripe configurado (fase de lançamento, tudo grátis), não limitamos profissionais nem lembretes.
 * A IA continua limitada ao plano mesmo assim, porque tem custo por uso.
 */
export function limitsFor(plan: Plan, billingEnabled = isBillingEnabled()): PlanLimits {
  if (billingEnabled) return PLANS[plan].limits;
  return { ...PLANS.BUSINESS.limits, aiRequestsPerMonth: PLANS[plan].limits.aiRequestsPerMonth };
}
