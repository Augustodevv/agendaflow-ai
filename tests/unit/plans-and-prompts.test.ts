import { afterEach, describe, expect, it, vi } from "vitest";
import { entitledPlan } from "@/modules/billing/service";
import { limitsFor, planFromPriceId, PLANS } from "@/modules/billing/plans";
import { messagePrompt, occupancyPrompt, summaryPrompt, SYSTEM_PROMPT, type MetricsInput } from "@/modules/ai/prompts";

afterEach(() => vi.unstubAllEnvs());

describe("limites por plano", () => {
  it("com cobrança ativa, respeita o plano", () => {
    expect(limitsFor("FREE", true).maxStaff).toBe(1);
    expect(limitsFor("STARTER", true).autoReminders).toBe(false);
    expect(limitsFor("PRO", true).autoReminders).toBe(true);
  });

  it("sem cobrança (lançamento), não limita profissionais nem lembretes, mas a IA segue o plano", () => {
    const free = limitsFor("FREE", false);
    expect(free.maxStaff).toBe(PLANS.BUSINESS.limits.maxStaff);
    expect(free.autoReminders).toBe(true);
    expect(free.aiRequestsPerMonth).toBe(0);
    expect(limitsFor("PRO", false).aiRequestsPerMonth).toBe(PLANS.PRO.limits.aiRequestsPerMonth);
  });

  it("preços iniciais conforme o plano de negócio", () => {
    expect([PLANS.STARTER.priceCents, PLANS.PRO.priceCents, PLANS.BUSINESS.priceCents]).toEqual([3900, 7900, 14900]);
  });

  it("mapeia o price do Stripe para o plano", () => {
    vi.stubEnv("STRIPE_PRICE_PRO", "price_pro_123");
    expect(planFromPriceId("price_pro_123")).toBe("PRO");
    expect(planFromPriceId("price_desconhecido")).toBeNull();
    expect(planFromPriceId(undefined)).toBeNull();
  });
});

describe("direito ao plano conforme o status da assinatura", () => {
  it("ativa, em teste e com pagamento pendente mantêm o plano", () => {
    expect(entitledPlan("PRO", "ACTIVE")).toBe("PRO");
    expect(entitledPlan("PRO", "TRIALING")).toBe("PRO");
    expect(entitledPlan("PRO", "PAST_DUE")).toBe("PRO");
  });
  it("cancelada ou incompleta volta para o grátis", () => {
    expect(entitledPlan("PRO", "CANCELED")).toBe("FREE");
    expect(entitledPlan("PRO", "INCOMPLETE")).toBe("FREE");
  });
});

const metrics: MetricsInput = {
  periodLabel: "últimos 30 dias",
  bookingsCompleted: 42,
  bookingsCancelled: 5,
  noShows: 3,
  revenueCents: 189000,
  newCustomers: 11,
  topServices: [{ name: "Corte", count: 30 }],
  bookingsByWeekday: [{ weekday: "Segunda", count: 2 }],
};

describe("prompts da IA", () => {
  it("o resumo carrega os números reais e nada além", () => {
    const p = summaryPrompt(metrics);
    expect(p).toContain("42");
    expect(p).toContain("Corte (30)");
    expect(p).toMatch(/1\.890,00/);
  });

  it("sem dados, avisa em vez de inventar", () => {
    const p = occupancyPrompt({ ...metrics, bookingsByWeekday: [] });
    expect(p).toContain("sem dados");
  });

  it("a mensagem usa só o primeiro nome e nenhum telefone", () => {
    const p = messagePrompt({
      kind: "confirmation",
      businessName: "Barbearia Teste",
      customerFirstName: "Carlos",
      serviceName: "Corte",
      whenLabel: "sex., 24 de out. às 14:30",
      tone: "amigavel",
    });
    expect(p).toContain("Carlos");
    expect(p).not.toMatch(/\d{8,}/);
  });

  it("as regras do sistema proíbem inventar números e prometer resultado", () => {
    expect(SYSTEM_PROMPT).toMatch(/Nunca invente/);
    expect(SYSTEM_PROMPT).toMatch(/Nunca prometa/);
  });
});
