# Deploy na Vercel (passo a passo)

Plano gratuito (Hobby) da Vercel serve para **demonstração e portfólio**. Os termos do Hobby proíbem uso comercial: antes de cobrar clientes, migre para o plano Pro.

## 1. Banco de dados (PostgreSQL gerenciado)
Opção usada neste guia: Supabase (plano gratuito, região `sa-east-1`).

1. Crie um projeto novo e guarde a senha do banco.
2. Em **Connect**, copie duas strings:
   - **Transaction pooler** (porta 6543) para o app em produção. Acrescente `?pgbouncer=true&connection_limit=1`.
   - **Session pooler** (porta 5432) para rodar as migrações.
3. Aplique as migrações a partir da sua máquina, com a string do *session pooler*:

```bash
DATABASE_URL="<session pooler>" npx prisma migrate deploy
```

A migração `booking_no_overlap` cria a extensão `btree_gist`, que o Supabase permite para o usuário `postgres`.

## 2. Projeto na Vercel
1. Em vercel.com, **Add New > Project** e importe o repositório `Augustodevv/agendaflow-ai`. O framework (Next.js) é detectado sozinho.
2. Em **Environment Variables** (Production), defina:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | string do *transaction pooler* (com `?pgbouncer=true&connection_limit=1`) |
| `BETTER_AUTH_SECRET` | gere com `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | URL final do site (ex.: `https://agendaflow-ai.vercel.app`) |
| `NEXT_PUBLIC_APP_URL` | mesma URL |
| `CRON_SECRET` | gere com `openssl rand -base64 32` (a Vercel envia no cabeçalho do cron) |

3. Clique em **Deploy**. O `postinstall` gera o cliente do Prisma durante o build.
4. Se a URL final for diferente da que você colocou em `BETTER_AUTH_URL`, corrija e faça **Redeploy**: o login recusa origens diferentes.

## 3. Conferir
- Abra `/cadastro`, crie uma conta e um negócio, cadastre serviço e profissional e faça uma reserva em `/agendar/<slug>`.
- Se algo falhar, veja **Logs** do deploy na Vercel.

## 4. Limitações do plano gratuito
- **Cron diário apenas.** O `vercel.json` roda os lembretes automáticos uma vez por dia (12:00 UTC). Para lembretes de hora em hora: plano Pro ou um agendador externo chamando `GET /api/cron/lembretes` com `Authorization: Bearer <CRON_SECRET>`.
- Stripe, IA e WhatsApp são opcionais: sem as chaves, o app roda com cobrança desligada (tudo gratuito).

## 5. Depois do primeiro deploy
- Stripe em modo teste: preencha as variáveis do README e aponte o webhook para `https://<seu-site>/api/webhooks/stripe`.
- Monitoramento de erros e backups do banco antes de aceitar clientes reais.

## Alternativa sem digitar a senha do banco (integração Supabase na Vercel)
Em **Integrations > Supabase**, instale a integração, vincule ao projeto da Vercel e escolha o projeto do Supabase. A Vercel cria `POSTGRES_PRISMA_URL` (pooler, pronta para serverless) e o app a usa quando `DATABASE_URL` não existe (`src/lib/db.ts`). Assim você só precisa definir `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` e `NEXT_PUBLIC_APP_URL`.
