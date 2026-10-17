"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { createPublicBookingAction } from "@/modules/bookings/actions";

type Props = { slug: string; serviceId: string; staffId?: string; startsAt: string; orgName: string };

export function BookingForm({ slug, serviceId, staffId, startsAt, orgName }: Props) {
  const [state, action, pending] = useActionState(createPublicBookingAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="serviceId" value={serviceId} />
      {staffId && <input type="hidden" name="staffId" value={staffId} />}
      <input type="hidden" name="startsAt" value={startsAt} />
      {/* Armadilha para robôs: invisível para pessoas. */}
      <div aria-hidden className="absolute -left-[9999px]">
        <label>
          Site <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field id="name" label="Seu nome" required maxLength={80} autoComplete="name" />
      <Field id="phone" label="WhatsApp" required inputMode="tel" autoComplete="tel" placeholder="(11) 91234-5678" hint="Usado para confirmar e lembrar do horário." />
      <Field id="email" label="E-mail (opcional)" type="email" autoComplete="email" />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
        <span className="text-muted">
          Autorizo {orgName} a usar meu nome e telefone para gerenciar este agendamento, conforme a LGPD.
        </span>
      </label>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-12 w-full text-base">
        {pending ? "Reservando..." : "Confirmar agendamento"}
      </Button>
    </form>
  );
}
