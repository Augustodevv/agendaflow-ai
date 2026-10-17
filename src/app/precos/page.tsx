import type { Metadata } from "next";
import Link from "next/link";
import { PlanTable } from "@/components/plan-table";

export const metadata: Metadata = {
  title: "Planos e preços",
  description: "Compare os planos do AgendaFlow AI.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-12">
      <Link href="/" className="text-sm text-brand underline">
        ← Voltar
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Planos e preços</h1>
      <p className="max-w-2xl text-muted">
        Valores iniciais, sujeitos a ajuste antes do lançamento. O pagamento é feito em página segura do Stripe e você
        cancela quando quiser pelo próprio painel.
      </p>
      <PlanTable />
      <p className="text-sm text-muted">
        O envio automático de WhatsApp usa a API oficial da Meta, que cobra à parte por conversa.
      </p>
      <Link
        href="/cadastro"
        className="inline-flex h-11 items-center rounded-lg bg-brand px-6 font-medium text-brand-foreground"
      >
        Criar conta
      </Link>
    </main>
  );
}
