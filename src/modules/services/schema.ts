import { z } from "zod";
import { parseBRL } from "@/lib/money";

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do serviço").max(80),
  description: z
    .string()
    .trim()
    .max(300, "Descrição muito longa")
    .optional()
    .transform((v) => v || null),
  durationMinutes: z.coerce
    .number({ error: "Informe a duração" })
    .int()
    .min(5, "Duração mínima de 5 minutos")
    .max(480, "Duração máxima de 8 horas"),
  priceCents: z
    .string()
    .transform((v, ctx) => {
      const cents = parseBRL(v);
      if (cents === null || cents > 10_000_000) {
        ctx.addIssue({ code: "custom", message: "Preço inválido. Ex.: 45 ou 45,90" });
        return z.NEVER;
      }
      return cents;
    }),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
