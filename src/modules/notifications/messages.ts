import { formatDate, formatTime } from "@/lib/time";

export type ReminderData = {
  customerName: string;
  customerPhone: string;
  businessName: string;
  serviceName: string;
  staffName: string;
  startsAt: Date;
  timezone: string;
  manageUrl: string;
};

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function manageUrl(slug: string, token: string): string {
  return `${appUrl()}/agendar/${slug}/reserva/${token}`;
}

export function reminderText(d: ReminderData): string {
  const firstName = d.customerName.split(" ")[0];
  return [
    `Olá, ${firstName}! Lembrete do seu horário em ${d.businessName}:`,
    `${d.serviceName} com ${d.staffName}, ${formatDate(d.startsAt, d.timezone)} às ${formatTime(d.startsAt, d.timezone)}.`,
    `Se não puder vir, cancele por aqui para liberar o horário: ${d.manageUrl}`,
  ].join("\n");
}

/** Link wa.me com a mensagem pronta: funciona sem nenhuma integração paga. */
export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
}
