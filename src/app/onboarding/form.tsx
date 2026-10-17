"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { createOrganization } from "@/modules/organizations/actions";

export function OnboardingForm() {
  const [state, action, pending] = useActionState(createOrganization, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field id="name" label="Nome do negócio" required />
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Criando..." : "Continuar"}
      </Button>
    </form>
  );
}
