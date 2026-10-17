import Anthropic from "@anthropic-ai/sdk";
import type { Plan } from "@/generated/prisma/client";
import { hit } from "@/lib/rate-limit";
import { limitsFor } from "@/modules/billing/plans";
import { recordAiTokens, releaseAiRequest, reserveAiRequest } from "./quota";
import { SYSTEM_PROMPT } from "./prompts";

export const DEFAULT_MODEL = "claude-haiku-5-5";
const MAX_OUTPUT_TOKENS = 600;

/** Interface mínima do modelo: permite trocar de provedor e testar sem rede. */
export type LlmClient = (args: { system: string; prompt: string; maxTokens: number }) => Promise<{
  text: string;
  inputTokens: number;
  outputTokens: number;
}>;

export const isAiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

/** Cliente padrão (somente servidor). O modelo é configurável por AI_MODEL. */
export const anthropicClient: LlmClient = async ({ system, prompt, maxTokens }) => {
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: process.env.AI_MODEL || DEFAULT_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  return { text, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
};

export type AiResult = { ok: true; text: string } | { ok: false; error: string };

/**
 * Executa uma geração com todas as proteções: IA configurada, plano com direito,
 * limite por minuto (anti-abuso), cota mensal atômica, estorno em caso de erro e registro de tokens.
 */
export async function generate(
  org: { id: string; plan: Plan },
  prompt: string,
  client: LlmClient = anthropicClient,
): Promise<AiResult> {
  if (!isAiConfigured() && client === anthropicClient) {
    return { ok: false, error: "A IA ainda não foi configurada neste ambiente." };
  }
  const limit = limitsFor(org.plan).aiRequestsPerMonth;
  if (limit <= 0) return { ok: false, error: "A IA não está disponível no seu plano. Faça upgrade para usar." };

  if (!(await hit(`ai:${org.id}`, 10, 60_000))) {
    return { ok: false, error: "Muitas solicitações seguidas. Aguarde um minuto." };
  }
  if (!(await reserveAiRequest(org.id, limit))) {
    return { ok: false, error: "Você usou todas as gerações de IA deste mês. O limite volta no próximo mês." };
  }

  try {
    const out = await client({ system: SYSTEM_PROMPT, prompt, maxTokens: MAX_OUTPUT_TOKENS });
    if (!out.text) throw new Error("resposta vazia");
    await recordAiTokens(org.id, out.inputTokens, out.outputTokens);
    return { ok: true, text: out.text };
  } catch (e) {
    await releaseAiRequest(org.id);
    // Sem vazar detalhes do provedor para o usuário; o detalhe vai para o log do servidor.
    console.error("[ai] falha na geração", org.id, e instanceof Error ? e.message : e);
    return { ok: false, error: "Não foi possível gerar agora. Tente de novo em instantes. Você não perdeu nenhuma geração." };
  }
}
