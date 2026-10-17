// Rota autenticada: lê a sessão a cada requisição e não entra no shell estático.
export const instant = false;

import Link from "next/link";
import { requireOrg } from "@/lib/session";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { organization, user } = await requireOrg();
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/painel" className="shrink-0 font-semibold">
              AgendaFlow <span className="text-brand">AI</span>
            </Link>
            <span className="truncate text-sm text-muted">{organization.name}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="hidden sm:inline">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-2">
          <AppNav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
