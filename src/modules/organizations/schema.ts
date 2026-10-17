import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do negócio").max(80),
});
