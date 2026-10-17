import Link from "next/link";

const features = [
  ["Reserva pelo celular", "O cliente escolhe serviço, profissional e horário em poucos toques. Sem criar conta."],
  ["Sem horário duplicado", "O banco de dados recusa dois agendamentos no mesmo horário, mesmo com várias pessoas reservando ao mesmo tempo."],
  ["Lembrete por WhatsApp", "Botão de lembrete com a mensagem pronta e envio automático opcional pela API oficial do WhatsApp."],
  ["Cliente cancela sozinho", "Link secreto no lembrete: o cliente cancela e a vaga volta para a agenda."],
  ["Números reais do negócio", "Atendimentos, faturamento registrado, faltas e clientes novos, calculados a partir das suas reservas."],
  ["Seus dados protegidos", "Cada negócio só enxerga os próprios dados. Consentimento LGPD no formulário de reserva."],
];

const faqs = [
  ["O cliente precisa criar conta?", "Não. Ele informa nome e WhatsApp, aceita o uso dos dados e confirma."],
  ["Funciona com mais de um profissional?", "Sim. Cada profissional tem serviços, jornada, folgas e bloqueios próprios, e o cliente pode escolher \"sem preferência\"."],
  ["Quanto custa?", "Veja os planos na página de preços. Os valores são iniciais e nenhuma cobrança acontece sem você assinar."],
  ["O envio automático de WhatsApp está incluso?", "É opcional e exige uma conta na WhatsApp Cloud API da Meta, com cobrança própria dela. Sem isso, você envia o lembrete com um toque pelo seu WhatsApp."],
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <span className="font-semibold">
          AgendaFlow <span className="text-brand">AI</span>
        </span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/entrar" className="text-muted hover:text-foreground">Entrar</Link>
          <Link href="/cadastro" className="rounded-lg bg-brand px-4 py-2 font-medium text-brand-foreground">Criar conta</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Agenda online para barbearias e salões</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
            Seus clientes reservam pelo celular. Você para de responder mensagem para marcar horário e acompanha o
            negócio num só lugar.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/cadastro" className="inline-flex h-11 items-center rounded-lg bg-brand px-6 font-medium text-brand-foreground">
              Começar grátis
            </Link>
            <a href="#funcionalidades" className="inline-flex h-11 items-center rounded-lg border border-border px-6 font-medium">
              Ver funcionalidades
            </a>
          </div>
        </section>

        <section id="funcionalidades" className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="mb-8 text-2xl font-semibold">O que você recebe</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, text]) => (
              <li key={title} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-medium">{title}</h3>
                <p className="mt-2 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="mb-6 text-2xl font-semibold">Perguntas frequentes</h2>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {faqs.map(([q, a]) => (
              <details key={q} className="p-4">
                <summary className="cursor-pointer font-medium">{q}</summary>
                <p className="mt-2 text-sm text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold">Configure em poucos minutos</h2>
          <p className="mt-2 text-muted">Cadastre serviços e horários e compartilhe o link de reservas.</p>
          <Link href="/cadastro" className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand px-6 font-medium text-brand-foreground">
            Criar minha conta
          </Link>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
          <span>© 2026 AgendaFlow AI</span>
          <nav className="flex gap-4">
            <Link href="/precos" className="hover:text-foreground">Planos</Link>
            <Link href="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <Link href="/termos" className="hover:text-foreground">Termos de uso</Link>
            <a href="https://github.com/Augustodevv/agendaflow-ai/issues" className="hover:text-foreground">Contato</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
