import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { processStripeEvent } from "@/modules/billing/service";

const stripe = new Stripe("sk_test_unit_only");
const SECRET = "whsec_test_secret";
const tag = `t-bill-${Date.now()}`;
let orgId: string;

function subEvent(id: string, type: string, status: string, opts: { org?: string; customer?: string; sub?: string } = {}) {
  return {
    id,
    type,
    data: {
      object: {
        id: opts.sub ?? "sub_test_1",
        customer: opts.customer ?? "cus_test_1",
        status,
        cancel_at_period_end: false,
        metadata: { organizationId: opts.org ?? orgId, plan: "PRO" },
        items: { data: [{ price: { id: "price_pro_test" }, current_period_end: 1_900_000_000 }] },
      },
    },
  } as unknown as Stripe.Event;
}

beforeAll(async () => {
  vi.stubEnv("STRIPE_PRICE_PRO", "price_pro_test");
  const org = await db.organization.create({ data: { name: "Billing", slug: tag } });
  orgId = org.id;
});

afterAll(async () => {
  await db.organization.deleteMany({ where: { slug: { startsWith: "t-bill-" } } });
  await db.webhookEvent.deleteMany({ where: { id: { startsWith: "evt_t_" } } });
  await db.$disconnect();
});

describe("assinatura do webhook", () => {
  const payload = JSON.stringify({ id: "evt_t_sig", object: "event", type: "ping" });

  it("aceita uma assinatura válida", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    expect(stripe.webhooks.constructEvent(payload, header, SECRET).id).toBe("evt_t_sig");
  });

  it("recusa corpo adulterado", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    expect(() => stripe.webhooks.constructEvent(payload + " ", header, SECRET)).toThrow();
  });

  it("recusa segredo errado", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_outro" });
    expect(() => stripe.webhooks.constructEvent(payload, header, SECRET)).toThrow();
  });
});

describe("processamento de eventos", () => {
  it("assinatura ativa muda o plano da organização", async () => {
    expect(await processStripeEvent(subEvent("evt_t_1", "customer.subscription.created", "active"))).toBe("processed");
    const org = await db.organization.findUniqueOrThrow({ where: { id: orgId }, include: { subscription: true } });
    expect(org.plan).toBe("PRO");
    expect(org.stripeCustomerId).toBe("cus_test_1");
    expect(org.subscription?.status).toBe("ACTIVE");
    expect(org.subscription?.currentPeriodEnd).toBeInstanceOf(Date);
  });

  it("evento repetido é ignorado (idempotência)", async () => {
    expect(await processStripeEvent(subEvent("evt_t_1", "customer.subscription.created", "active"))).toBe("duplicate");
  });

  it("entregas simultâneas do mesmo evento processam uma vez só", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => processStripeEvent(subEvent("evt_t_race", "customer.subscription.updated", "active"))),
    );
    expect(results.filter((r) => r === "processed")).toHaveLength(1);
  });

  it("pagamento falho mantém o plano e marca pendência", async () => {
    await processStripeEvent(subEvent("evt_t_2", "customer.subscription.updated", "past_due"));
    const org = await db.organization.findUniqueOrThrow({ where: { id: orgId }, include: { subscription: true } });
    expect(org.plan).toBe("PRO");
    expect(org.subscription?.status).toBe("PAST_DUE");
  });

  it("cancelamento volta a organização para o plano grátis", async () => {
    await processStripeEvent(subEvent("evt_t_3", "customer.subscription.deleted", "canceled"));
    const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
    expect(org.plan).toBe("FREE");
  });

  it("evento de outro tipo é registrado e ignorado", async () => {
    const ev = { id: "evt_t_4", type: "charge.refunded", data: { object: {} } } as unknown as Stripe.Event;
    expect(await processStripeEvent(ev)).toBe("ignored");
  });

  it("falha desfaz tudo: o evento não fica marcado e pode ser reenviado", async () => {
    const bad = subEvent("evt_t_5", "customer.subscription.updated", "active", { org: "org-inexistente", customer: "cus_nao_existe" });
    await expect(processStripeEvent(bad)).rejects.toThrow();
    expect(await db.webhookEvent.findUnique({ where: { id: "evt_t_5" } })).toBeNull();
  });

  it("assinatura com metadata de outra empresa não altera a empresa errada", async () => {
    const other = await db.organization.create({ data: { name: "Outra", slug: `${tag}-b` } });
    await processStripeEvent(subEvent("evt_t_6", "customer.subscription.created", "active", { org: other.id, customer: "cus_other", sub: "sub_test_other" }));
    expect((await db.organization.findUniqueOrThrow({ where: { id: other.id } })).plan).toBe("PRO");
    expect((await db.organization.findUniqueOrThrow({ where: { id: orgId } })).plan).toBe("FREE");
  });
});
