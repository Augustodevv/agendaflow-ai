"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/action-form";
import type { AiState } from "@/modules/ai/actions";

/** Formulário de uma geração de IA: mostra o texto (ou o erro) e deixa copiar. */
export function AiForm({
  action,
  label,
  children,
}: {
  action: (state: AiState, formData: FormData) => Promise<AiState>;
  label: string;
  children?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-3">
      {children}
      <SubmitButton pendingLabel="Gerando...">{label}</SubmitButton>
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.text && (
        <div role="status" className="space-y-2">
          <p className="whitespace-pre-wrap rounded-lg border border-border bg-background p-4 text-sm">{state.text}</p>
          <button
            type="button"
            className="text-sm text-brand underline"
            onClick={() => navigator.clipboard.writeText(state.text ?? "")}
          >
            Copiar texto
          </button>
          <p className="text-xs text-muted">Texto gerado por IA. Revise antes de usar.</p>
        </div>
      )}
    </form>
  );
}
