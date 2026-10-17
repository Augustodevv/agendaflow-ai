import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getAiUsage, reserveAiRequest } from "@/modules/ai/quota";
import { generate, type LlmClient } from "@/modules/ai/service";

const tag = `t-ai-${Date.now()}`;
let proOrg: { id: string; plan: "PRO" };
let freeOrg: { id: string; plan: "FREE" };

const okClient: LlmClient = async () => ({ text: "Mensagem pronta.", inputTokens: 120, outputTokens: 30 });
const failingClient: LlmClient = async () => {
  throw new Error("provedor fora do ar");
};

beforeAll(async () => {
  const pro = await db.organization.create({ data: { name: "AI Pro", slug: `${tag}-pro`, plan: "PRO" } });
  const free = await db.organization.create({ data: { name: "AI Free", slug: `${tag}-free`, plan: "FREE" } });
  proOrg = { id: pro.id, plan: "PRO" };
  freeOrg = { id: free.id, plan: "FREE" };
});

afterAll(async () => {
  await db.organization.deleteMany({ where: { slug: { startsWith: "t-ai-" } } });
  await db.rateLimitHit.deleteMany({ where: { key: { startsWith: "ai:" } } });
  await db.$disconnect();
});

describe("cota mensal de IA", () => {
  it("10 chamadas simultâneas com limite 3: só 3 passam", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => reserveAiRequest(proOrg.id, 3)));
    expect(results.filter(Boolean)).toHaveLength(3);
    expect((await getAiUsage(proOrg.id)).requests).toBe(3);
  });

  it("limite zero nunca reserva", async () => {
    expect(await reserveAiRequest(freeOrg.id, 0)).toBe(false);
  });

  it("o consumo de uma empresa não afeta a outra", async () => {
    expect((await getAiUsage(freeOrg.id)).requests).toBe(0);
  });
});

describe("geração com proteções", () => {
  it("plano sem IA é recusado antes de chamar o modelo", async () => {
    let called = false;
    const result = await generate(freeOrg, "oi", async (...args) => {
      called = true;
      return okClient(...args);
    });
    expect(result.ok).toBe(false);
    expect(called).toBe(false);
  });

  it("sucesso registra a chamada e os tokens", async () => {
    const org = await db.organization.create({ data: { name: "AI ok", slug: `${tag}-ok`, plan: "STARTER" } });
    const result = await generate({ id: org.id, plan: "STARTER" }, "oi", okClient);
    expect(result).toEqual({ ok: true, text: "Mensagem pronta." });
    expect(await getAiUsage(org.id)).toEqual({ requests: 1, inputTokens: 120, outputTokens: 30 });
  });

  it("erro do provedor devolve a cota e não vaza detalhes", async () => {
    const org = await db.organization.create({ data: { name: "AI falha", slug: `${tag}-fail`, plan: "STARTER" } });
    const result = await generate({ id: org.id, plan: "STARTER" }, "oi", failingClient);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("provedor fora do ar");
    expect((await getAiUsage(org.id)).requests).toBe(0);
  });
});
