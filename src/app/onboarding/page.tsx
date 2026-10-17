export const instant = false;

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { OnboardingForm } from "./form";

export default async function Page() {
  const user = await requireUser();
  if (await db.membership.findFirst({ where: { userId: user.id } })) redirect("/painel");
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Qual é o nome do seu negócio?</h1>
      <p className="text-sm text-muted">Ele aparecerá na sua página de reservas.</p>
      <OnboardingForm />
    </main>
  );
}
