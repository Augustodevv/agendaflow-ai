import { z } from "zod";

export const publicBookingSchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().optional(),
  startsAt: z.iso.datetime({ error: "Escolha um horário" }),
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""))
    .refine((v) => /^\d{10,11}$/.test(v), "Informe um WhatsApp com DDD, ex.: (11) 91234-5678"),
  email: z
    .union([z.literal(""), z.email("E-mail inválido")])
    .optional()
    .transform((v) => v || null),
  consent: z.literal("on", { error: "Você precisa aceitar o uso dos seus dados para o agendamento." }),
});

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;

export const STATUS_LABELS = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
} as const;

export const ownerStatusSchema = z.enum(["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]);
