import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-4">
      <h1 className="text-4xl font-semibold tracking-tight">Agenda online para barbearias e salões.</h1>
      <p className="text-lg text-muted">
        Seus clientes reservam pelo celular, sem criar conta. Você acompanha agenda e indicadores num só lugar.
      </p>
      <div className="flex gap-3">
        <Link href="/cadastro" className="inline-flex h-11 items-center rounded-lg bg-brand px-5 font-medium text-brand-foreground">
          Criar conta
        </Link>
        <Link href="/entrar" className="inline-flex h-11 items-center rounded-lg border border-border px-5 font-medium">
          Entrar
        </Link>
      </div>
      <p className="text-sm text-muted">Em desenvolvimento. Landing completa, planos e preços na Fase 5.</p>
    </main>
  );
}
