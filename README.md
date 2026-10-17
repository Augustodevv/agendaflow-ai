# AgendaFlow AI

SaaS de agendamento para barbearias e profissionais de beleza. Os clientes reservam por uma página pública, sem criar conta, e o dono acompanha agenda e indicadores num painel.

> **Status: Fase 4 concluída.** O produto já funciona de ponta a ponta: o dono cadastra serviços, profissionais e jornada; o cliente reserva pela página pública; o dono acompanha agenda e indicadores. Lembretes por WhatsApp, cancelamento pelo cliente e proteções de segurança já funcionam. Assinaturas, deploy e IA ainda **não** foram implementados. Veja o [roadmap](#roadmap).

## O que já funciona
- **Painel do dono** (`/painel`): indicadores do dia e do mês (atendimentos, faturamento, taxa de faltas, clientes novos), próximos horários, checklist de configuração e link da página de reservas.
- **Serviços**: nome, duração, preço e descrição; pausar e reativar.
- **Profissionais**: serviços que cada um realiza, jornada semanal com pausa de almoço, folgas e bloqueios pontuais.
- **Agenda** (`/painel/agenda`): navegação por dia, filtro por profissional, link direto para o WhatsApp do cliente, ações de concluir, marcar falta, cancelar e reativar.
- **Página pública** (`/agendar/<slug>`): o cliente escolhe serviço, profissional (ou "sem preferência"), dia e horário, e informa nome e WhatsApp com consentimento LGPD. Não precisa criar conta.
- **Link da reserva** (`/agendar/<slug>/reserva/<token>`): link secreto onde o cliente vê e cancela o próprio horário, liberando a vaga. Vai no lembrete.
- **Lembretes por WhatsApp**, de dois jeitos:
  - **Sem configurar nada:** na agenda, o botão "Enviar lembrete" abre o WhatsApp do dono com a mensagem pronta.
  - **Automático:** `GET /api/cron/lembretes` (de hora em hora, via `vercel.json`) envia pela WhatsApp Cloud API para quem tem horário nas próximas 24 h. Não envia duas vezes, mesmo com execuções simultâneas, e tenta de novo se falhar.

### Configurar o envio automático
1. Crie um app na Meta for Developers com WhatsApp e pegue o token e o *Phone number ID*.
2. Crie e aprove o template `lembrete_agendamento` (pt_BR) com 5 variáveis no corpo:
   `Olá, {{1}}! Lembrete do seu horário em {{2}}: {{3}}, {{4}}. Se não puder vir, cancele aqui: {{5}}`
3. Preencha `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_REMINDER_TEMPLATE` e `CRON_SECRET` no `.env`.

## Segurança
- Cabeçalhos: CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS; sem `X-Powered-By`.
- Limite de reservas por rede (8 a cada 10 min) e por telefone (4 por hora), guardado no PostgreSQL; o IP é salvo só como hash.
- Campo-armadilha contra robôs no formulário público.
- Rota de lembretes protegida por segredo com comparação em tempo constante.
- Link da reserva com token aleatório (UUID), fora dos buscadores e sem vazar no Referer.

## Stack
Next.js (App Router) · React · TypeScript · Tailwind CSS · PostgreSQL · Prisma · Better Auth · Zod · Vitest

## Como rodar
Requisitos: Node 22+ e Docker **ou** o banco embutido do projeto.

```bash
npm install
cp .env.example .env        # preencha BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d        # ou: npm run db:dev (PostgreSQL embutido, sem Docker)
npx prisma migrate dev
npm run dev
```

## Testes
```bash
npm test            # unitários e integração (precisa do banco rodando)
npm run lint && npm run typecheck && npm run build
```
```bash
npm run build && npm run test:e2e   # E2E com Playwright (desktop e celular), sobe o servidor sozinho
```
Cobrem:
- **Horários livres**: jornada, pausa, bloqueios, antecedência mínima, fuso e horário de verão.
- **Reserva duplicada**: 20 reservas simultâneas no banco e 10 clientes disputando o mesmo horário pela página pública: só 1 é aceita.
- **Isolamento entre empresas**: uma empresa não altera serviços, profissionais, jornadas, bloqueios nem reservas de outra.
- **Regras da reserva**: horário fora da jornada é recusado (o servidor não confia no navegador), "sem preferência" distribui entre profissionais, cliente é reaproveitado pelo telefone.
- **Lembretes**: só reservas confirmadas nas próximas 24 h, sem duplicar (inclusive com duas execuções ao mesmo tempo) e com nova tentativa após falha.
- **Cancelamento pelo cliente**: só com o token certo, só da própria empresa e só antes do horário.
- **Limite de tentativas**: bloqueia depois do limite e libera quando a janela passa.
- **E2E**: cadastro, configuração, reserva, link de lembrete, cancelamento pelo cliente e pelo dono, cabeçalhos de segurança e **acessibilidade (axe, WCAG A/AA)** nas telas principais, em desktop e celular.

## Decisões de arquitetura
- **Monólito modular**: `src/modules/<dominio>` com `actions` (entrada), `service` (regra de negócio), `schema` (Zod).
- **Multi-tenant**: toda tabela de negócio tem `organizationId`. O id da organização vem sempre da sessão no servidor (`requireOrg()`), nunca do cliente.
- **Sem reserva duplicada**: *exclusion constraint* do PostgreSQL por profissional (`prisma/migrations/*booking_no_overlap`). A garantia é do banco, então vale sob concorrência.
- **Horários em UTC**, com o fuso da organização guardado à parte (`America/Sao_Paulo` por padrão).
- **Valores em centavos** (inteiros).
- **Horários livres calculados por função pura** (`src/modules/availability/slots.ts`), testada sem banco. Na reserva, o servidor recalcula a grade e só aceita horários que estão nela.
- **Formulários com Server Actions** e `useActionState`; o `organizationId` nunca vem do formulário.

## Modelo de dados
```mermaid
erDiagram
  User ||--o{ Membership : tem
  Organization ||--o{ Membership : tem
  Organization ||--o{ Service : oferece
  Organization ||--o{ Staff : emprega
  Organization ||--o{ Customer : atende
  Staff }o--o{ Service : realiza
  Staff ||--o{ AvailabilityRule : define
  Staff ||--o{ TimeBlock : bloqueia
  Booking }o--|| Staff : com
  Booking }o--|| Service : de
  Booking }o--|| Customer : para
  Organization ||--o{ Booking : possui
```

## Roadmap
- [x] Fase 1: planejamento
- [x] Fase 2: fundação (auth, organização, banco, CI)
- [x] Fase 3: serviços, profissionais, disponibilidade, agenda, página pública, dashboard
- [x] Fase 4: lembretes por WhatsApp, cancelamento pelo cliente, segurança, acessibilidade
- [ ] Fase 5: landing, assinaturas, deploy
- [ ] Fase 6: IA
- [ ] Fase 7: documentação final e demonstração

## Licença
Código-fonte disponível para avaliação, **não** livre para uso comercial. Veja [LICENSE](LICENSE).
