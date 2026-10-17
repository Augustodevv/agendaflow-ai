import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do negócio").max(80),
});

export const organizationProfileSchema = createOrganizationSchema.extend({
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""))
    .refine((v) => v === "" || /^\d{10,11}$/.test(v), "WhatsApp inválido. Use DDD + número.")
    .transform((v) => v || null),
});
