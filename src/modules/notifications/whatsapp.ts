import { formatDate, formatTime } from "@/lib/time";
import type { ReminderData } from "./messages";

export type SendResult = { sent: true } | { sent: false; reason: string };
export type ReminderSender = (data: ReminderData) => Promise<SendResult>;

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_REMINDER_TEMPLATE);
}

/**
 * Envio automático pela WhatsApp Cloud API (Meta). Mensagens iniciadas pela empresa
 * exigem um template aprovado; o modelo esperado está no README.
 * Sem as variáveis de ambiente, não envia e avisa o motivo.
 */
export const sendWhatsAppReminder: ReminderSender = async (d) => {
  if (!whatsappConfigured()) return { sent: false, reason: "WhatsApp não configurado" };

  const params = [
    d.customerName.split(" ")[0],
    d.businessName,
    d.serviceName,
    `${formatDate(d.startsAt, d.timezone)} às ${formatTime(d.startsAt, d.timezone)}`,
    d.manageUrl,
  ].map((text) => ({ type: "text", text }));

  const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: `55${d.customerPhone}`,
      type: "template",
      template: {
        name: process.env.WHATSAPP_REMINDER_TEMPLATE,
        language: { code: "pt_BR" },
        components: [{ type: "body", parameters: params }],
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { sent: false, reason: `WhatsApp respondeu ${res.status}` };
  return { sent: true };
};
