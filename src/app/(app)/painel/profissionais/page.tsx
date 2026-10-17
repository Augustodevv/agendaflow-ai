import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { requireOrg } from "@/lib/session";
import { createStaffAction } from "@/modules/staff/actions";
import { listStaff } from "@/modules/staff/service";

export const metadata: Metadata = { title: "Profissionais" };

export default async function Page() {
  const { organization } = await requireOrg();
  const staff = await listStaff(organization.id);

  return (
    <>
      <PageHeader title="Profissionais" description="Quem atende, quais serviços faz e em que horários." />

      <Card className="mb-8">
        <ActionForm action={createStaffAction} resetOnSuccess className="flex flex-wrap items-end gap-3">
          <Field id="new-staff-name" name="name" label="Novo profissional" required maxLength={60} placeholder="Nome" className="min-w-56 flex-1" />
          <SubmitButton pendingLabel="Adicionando...">Adicionar</SubmitButton>
        </ActionForm>
      </Card>

      {staff.length === 0 ? (
        <EmptyState title="Nenhum profissional ainda">Se você atende sozinho, cadastre seu próprio nome.</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {staff.map((s) => {
            const days = new Set(s.availability.map((r) => r.weekday)).size;
            return (
              <li key={s.id}>
                <Link href={`/painel/profissionais/${s.id}`} className="block rounded-xl transition hover:-translate-y-0.5">
                  <Card className="h-full">
                    <p className="font-medium">
                      {s.name} {!s.active && <Badge tone="muted">Pausado</Badge>}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {s.services.length} {s.services.length === 1 ? "serviço" : "serviços"} ·{" "}
                      {days === 0 ? <span className="text-danger">sem jornada definida</span> : `atende ${days} ${days === 1 ? "dia" : "dias"} por semana`}
                    </p>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
