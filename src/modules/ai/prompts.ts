/**
 * Prompts da IA. Funções puras: recebem apenas dados reais já calculados pelo sistema.
 * Regras fixas: não inventar números, não prometer resultado financeiro, não receber telefone.
 */

export const SYSTEM_PROMPT = [
  "Você é um assistente de gestão para pequenos negócios de beleza (barbearias e salões) no Brasil.",
  "Responda em português do Brasil, em tom direto e profissional, sem enrolação.",
  "Use SOMENTE os dados fornecidos pelo usuário. Nunca invente números, clientes ou fatos.",
  "Se um dado não foi fornecido, diga que não há dados suficientes.",
  "Nunca prometa aumento de faturamento ou qualquer resultado financeiro.",
  "Não peça nem repita telefones, e-mails ou outros dados pessoais.",
].join("\n");

export type MetricsInput = {
  /** Período a que os números se referem, ex.: "últimos 30 dias". */
  periodLabel: string;
  bookingsCompleted: number;
  bookingsCancelled: number;
  noShows: number;
  revenueCents: number;
  newCustomers: number;
  topServices: { name: string; count: number }[];
  /** Ocupação por dia da semana: reservas ativas no período. */
  bookingsByWeekday: { weekday: string; count: number }[];
};

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function summaryPrompt(m: MetricsInput): string {
  const lines = [
    `Resuma o desempenho do negócio no período: ${m.periodLabel}.`,
    "Dados reais do sistema:",
    `- Atendimentos concluídos: ${m.bookingsCompleted}`,
    `- Reservas canceladas: ${m.bookingsCancelled}`,
    `- Faltas (no-show): ${m.noShows}`,
    `- Receita registrada: ${brl(m.revenueCents)}`,
    `- Clientes novos: ${m.newCustomers}`,
    `- Serviços mais procurados: ${m.topServices.map((s) => `${s.name} (${s.count})`).join(", ") || "sem dados"}`,
    "Escreva até 5 frases: o que os números mostram e 2 pontos de atenção baseados neles.",
  ];
  return lines.join("\n");
}

export function occupancyPrompt(m: MetricsInput): string {
  const days = m.bookingsByWeekday.map((d) => `${d.weekday}: ${d.count}`).join("; ") || "sem dados";
  return [
    `Com base no volume de reservas por dia da semana (${m.periodLabel}), sugira de 3 a 5 ações simples para melhorar a ocupação da agenda.`,
    `Reservas por dia da semana: ${days}`,
    "Cada sugestão deve citar o dado que a motiva. Não prometa resultados. Se houver pouco dado, diga isso.",
  ].join("\n");
}

export type MessageKind = "confirmation" | "reschedule";

export type MessageInput = {
  kind: MessageKind;
  businessName: string;
  /** Somente o primeiro nome do cliente (minimização de dados). */
  customerFirstName: string;
  serviceName: string;
  /** Data e hora já formatadas no fuso do negócio, ex.: "sexta, 24/10 às 14:30". */
  whenLabel: string;
  tone: "formal" | "amigavel";
};

export function messagePrompt(m: MessageInput): string {
  const goal =
    m.kind === "confirmation"
      ? "uma mensagem curta de WhatsApp confirmando o agendamento"
      : "uma mensagem curta de WhatsApp oferecendo reagendar o horário abaixo, sem culpar o cliente";
  return [
    `Escreva ${goal}. Tom ${m.tone === "formal" ? "formal" : "amigável"}.`,
    `Negócio: ${m.businessName}`,
    `Cliente: ${m.customerFirstName}`,
    `Serviço: ${m.serviceName}`,
    `Horário: ${m.whenLabel}`,
    "Máximo de 3 frases. Não invente endereço, preço ou política. Devolva só o texto da mensagem.",
  ].join("\n");
}
