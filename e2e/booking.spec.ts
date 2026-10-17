import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Falha se a página tiver problemas de acessibilidade graves ou críticos (WCAG A/AA). */
async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

const tomorrow = () => {
  const d = new Date(Date.now() + 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
};

test("dono configura o negócio, cliente reserva e dono vê na agenda", async ({ page }, info) => {
  const id = `${Date.now()}-${info.project.name}`;
  const business = `Barbearia E2E ${id}`;
  const phone = `119${String(Date.now()).slice(-8)}`;

  // Cadastro e criação do negócio
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Dono Teste");
  await page.getByLabel("E-mail").fill(`e2e-${id}@example.com`);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do negócio").fill(business);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();
  await expect(page.getByText("Deixe sua página de reservas pronta")).toBeVisible();
  await expectAccessible(page);

  // Serviço
  await page.getByRole("link", { name: "Serviços", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Serviços", level: 1 })).toBeVisible();
  await page.getByLabel("Nome").first().fill("Corte degradê");
  await page.getByLabel("Duração (min)").first().fill("30");
  await page.getByLabel("Preço (R$)").first().fill("45,00");
  await page.getByRole("button", { name: "Adicionar serviço" }).click();
  await expect(page.getByText("Serviço criado.")).toBeVisible();
  await expect(page.getByText("30 min · R$ 45,00")).toBeVisible();

  // Profissional e jornada (todos os dias, o dia inteiro, para o teste não depender da hora)
  await page.getByRole("link", { name: "Profissionais", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Profissionais", level: 1 })).toBeVisible();
  await page.getByLabel("Novo profissional").fill("João");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByRole("link", { name: /João/ }).click();
  await expect(page.getByRole("heading", { name: "João", level: 1 })).toBeVisible();
  for (const day of ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]) {
    await page.getByRole("checkbox", { name: day }).check();
    await page.getByLabel(`${day}: início`, { exact: true }).fill("08:00");
    await page.getByLabel(`${day}: fim`, { exact: true }).fill("20:00");
  }
  await page.getByRole("button", { name: "Salvar jornada" }).click();
  await expect(page.getByText("Jornada salva.")).toBeVisible();

  // Página pública
  await page.getByRole("link", { name: "Início" }).click();
  await expect(page.getByRole("heading", { name: "Início", level: 1 })).toBeVisible();
  await expect(page.getByText("Deixe sua página de reservas pronta")).toBeHidden();
  // Nada estoura a largura da tela (celular)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const publicUrl = await page.getByRole("link", { name: /\/agendar\// }).getAttribute("href");
  expect(publicUrl).toBeTruthy();

  const date = tomorrow();
  await page.goto(publicUrl!);
  await expect(page.getByRole("heading", { name: business })).toBeVisible();
  await page.getByRole("link", { name: /Corte degradê/ }).click();
  await page.getByRole("link", { name: /amanhã/ }).click();
  await page.waitForURL(new RegExp(`data=${date}`));
  await page.getByRole("link", { name: "10:00", exact: true }).click();
  await page.getByLabel("Seu nome").fill("Cliente E2E");
  await page.getByLabel("WhatsApp").fill(phone);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();
  await expect(page.getByRole("heading", { name: "Horário reservado!" })).toBeVisible();
  await expect(page.locator("dd", { hasText: "Corte degradê" })).toBeVisible();
  await expectAccessible(page);
  const manageLink = page.url().replace("?nova=1", "");

  // O horário some da grade
  await page.goto(`${publicUrl}?${new URLSearchParams({ data: date })}`);
  await page.getByRole("link", { name: /Corte degradê/ }).click();
  await expect(page.getByRole("link", { name: "10:00", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "10:30", exact: true })).toBeVisible();
  await expectAccessible(page);

  // Dono vê a reserva com o botão de lembrete
  await page.goto(`/painel/agenda?data=${date}`);
  await expect(page.getByText("Cliente E2E")).toBeVisible();
  const reminder = page.getByRole("link", { name: "Enviar lembrete" });
  const href = (await reminder.getAttribute("href")) ?? "";
  expect(href.startsWith(`https://wa.me/55${phone}?text=`)).toBe(true);
  expect(decodeURIComponent(href)).toContain("/reserva/");
  await expectAccessible(page);

  // Cliente cancela pelo link secreto e o horário volta para a grade
  await page.goto(manageLink);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /cancelar/ }).click();
  await expect(page.getByRole("heading", { name: "Agendamento cancelado" })).toBeVisible();
  await page.goto(`${publicUrl}?${new URLSearchParams({ data: date })}`);
  await page.getByRole("link", { name: /Corte degradê/ }).click();
  await expect(page.getByRole("link", { name: "10:00", exact: true })).toBeVisible();

  // Nova reserva no mesmo horário, agora cancelada pelo dono
  await page.getByRole("link", { name: "10:00", exact: true }).click();
  await page.getByLabel("Seu nome").fill("Cliente E2E");
  await page.getByLabel("WhatsApp").fill(phone);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();
  await expect(page.getByRole("heading", { name: "Horário reservado!" })).toBeVisible();

  // Dono vê e cancela na agenda
  await page.goto(`/painel/agenda?data=${date}`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByText("Cancelado", { exact: true })).toHaveCount(2);

  // Id de outra empresa (ou inexistente) não abre
  await page.goto("/painel/profissionais/nao-existe");
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
});

test("página de negócio inexistente mostra a tela de não encontrado", async ({ page }) => {
  await page.goto("/agendar/negocio-que-nao-existe-123");
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
});

test("envia cabeçalhos de segurança", async ({ request }) => {
  const res = await request.get("/");
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["x-powered-by"]).toBeUndefined();
});

test("rota de lembretes exige o segredo", async ({ request }) => {
  expect((await request.get("/api/cron/lembretes")).status()).toBe(401);
  expect((await request.get("/api/cron/lembretes", { headers: { authorization: "Bearer errado" } })).status()).toBe(401);
});
