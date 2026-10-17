import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { formatCents } from "@/lib/money";
import { requireOrg } from "@/lib/session";
import { createServiceAction, toggleServiceAction, updateServiceAction } from "@/modules/services/actions";
import { listServices } from "@/modules/services/service";

export const metadata: Metadata = { title: "Serviços" };

const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

function ServiceFields({ defaults, idPrefix }: { defaults?: { name: string; description: string | null; durationMinutes: number; priceCents: number }; idPrefix: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
      <Field id={`${idPrefix}-name`} name="name" label="Nome" required maxLength={80} defaultValue={defaults?.name} placeholder="Corte masculino" />
      <Field
        id={`${idPrefix}-durationMinutes`} name="durationMinutes"
        label="Duração (min)"
        type="number"
        min={5}
        max={480}
        step={5}
        required
        defaultValue={defaults?.durationMinutes ?? 30}
       
      />
      <Field
        id={`${idPrefix}-price`} name="price"
        label="Preço (R$)"
        inputMode="decimal"
        required
        defaultValue={defaults ? centsToInput(defaults.priceCents) : ""}
        placeholder="45,00"
       
      />
      <Field
        id={`${idPrefix}-description`} name="description"
        label="Descrição (opcional)"
        maxLength={300}
        defaultValue={defaults?.description ?? ""}
        className="sm:col-span-3"
        placeholder="Inclui lavagem e finalização"
       
      />
    </div>
  );
}

export default async function Page() {
  const { organization } = await requireOrg();
  const services = await listServices(organization.id);

  return (
    <>
      <PageHeader title="Serviços" description="O que seus clientes podem reservar, com duração e preço." />

      <Card className="mb-8">
        <h2 className="mb-4 font-medium">Novo serviço</h2>
        <ActionForm action={createServiceAction} resetOnSuccess className="space-y-4">
          <ServiceFields idPrefix="new" />
          <SubmitButton pendingLabel="Criando...">Adicionar serviço</SubmitButton>
        </ActionForm>
      </Card>

      {services.length === 0 ? (
        <EmptyState title="Nenhum serviço ainda">Cadastre o primeiro acima. Ele aparece na sua página de reservas.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {services.map((s) => (
            <li key={s.id}>
              <Card className={s.active ? "" : "opacity-70"}>
                <details>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {s.name} {!s.active && <Badge tone="muted">Pausado</Badge>}
                      </p>
                      <p className="text-sm text-muted">
                        {s.durationMinutes} min · {formatCents(s.priceCents)}
                        {s.description && ` · ${s.description}`}
                      </p>
                    </div>
                    <span className="text-sm text-brand">Editar</span>
                  </summary>
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    <ActionForm action={updateServiceAction} className="space-y-4">
                      <input type="hidden" name="id" value={s.id} />
                      <ServiceFields idPrefix={s.id} defaults={s} />
                      <SubmitButton>Salvar alterações</SubmitButton>
                    </ActionForm>
                    <ActionForm action={toggleServiceAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="active" value={String(!s.active)} />
                      <SubmitButton variant="ghost" pendingLabel="Aguarde...">
                        {s.active ? "Pausar serviço" : "Reativar serviço"}
                      </SubmitButton>
                    </ActionForm>
                  </div>
                </details>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
