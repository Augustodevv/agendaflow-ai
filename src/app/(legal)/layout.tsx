import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-12 text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
      <Link href="/" className="text-brand underline">
        ← Voltar
      </Link>
      {children}
      <p className="pt-6 text-muted">
        Modelo de texto elaborado para o projeto. Antes de operar comercialmente, deve ser revisado por advogado.
      </p>
    </main>
  );
}
