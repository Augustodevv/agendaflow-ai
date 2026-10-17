import type { ZodError } from "zod";

/** Retorno padrão das server actions usadas com useActionState. */
export type ActionState = { error?: string; ok?: string } | undefined;

export function firstIssue(error: ZodError): ActionState {
  return { error: error.issues[0]?.message ?? "Dados inválidos." };
}
