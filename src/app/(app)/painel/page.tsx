import type { Metadata } from "next";
import { requireOrg } from "@/lib/session";

export const metadata: Metadata = { title: "Painel" };

export default async function Page() {
  const { organization } = await requireOrg();
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Painel</h1>
      <p className="text-muted">
        Sua página de reservas ficará em <code>/agendar/{organization.slug}</code>. Serviços, profissionais e agenda
        chegam na Fase 3.
      </p>
    </section>
  );
}
