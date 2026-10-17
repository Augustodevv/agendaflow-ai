import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-medium text-brand">404</p>
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-muted">O endereço pode estar errado ou o conteúdo não existe mais.</p>
      <Link href="/" className="mt-2 inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium">
        Voltar ao início
      </Link>
    </main>
  );
}
