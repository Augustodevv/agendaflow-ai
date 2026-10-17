"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  /** Limpa os campos depois de salvar com sucesso (formulários de criação). */
  resetOnSuccess?: boolean;
  /** Pede confirmação antes de enviar (ações destrutivas). */
  confirmMessage?: string;
};

/**
 * Formulário ligado a uma server action, com mensagens acessíveis.
 * Pode ser usado direto em Server Components: os filhos são JSX comum.
 */
export function ActionForm({ action, children, className, resetOnSuccess, confirmMessage }: Props) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
      {(state?.error || state?.ok) && (
        <p role={state.error ? "alert" : "status"} className={`basis-full text-sm ${state.error ? "text-danger" : "text-brand"}`}>
          {state.error ?? state.ok}
        </p>
      )}
    </form>
  );
}

/** Botão de envio que se desabilita sozinho enquanto a action roda. */
export function SubmitButton({
  children,
  pendingLabel = "Salvando...",
  variant,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
