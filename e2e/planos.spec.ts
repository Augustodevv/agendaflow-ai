import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test("página de preços é pública e acessível", async ({ page }) => {
  await page.goto("/precos");
  await expect(page.getByRole("heading", { name: "Planos e preços" })).toBeVisible();
  await expect(page.getByText("R$ 39,00")).toBeVisible();
  await expect(page.getByText("R$ 79,00")).toBeVisible();
  await expect(page.getByText("R$ 149,00")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await expectAccessible(page);
});

test("webhook do Stripe recusa chamadas sem configuração ou sem assinatura", async ({ request }) => {
  const res = await request.post("/api/webhooks/stripe", { data: "{}" });
  expect([400, 503]).toContain(res.status());
});

test("dono vê assinatura e IA; sem plano, a IA avisa que está indisponível", async ({ page }, info) => {
  const id = `${Date.now()}-${info.project.name}`;
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Dono Planos");
  await page.getByLabel("E-mail").fill(`planos-${id}@example.com`);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do negócio").fill(`Planos ${id}`);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Início", level: 1 })).toBeVisible();

  await page.getByRole("link", { name: "Assinatura", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Assinatura", level: 1 })).toBeVisible();
  await expect(page.getByText("Plano atual: Grátis")).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("link", { name: "IA", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Assistente de IA", level: 1 })).toBeVisible();
  await expect(page.getByText("Indisponível no seu plano")).toBeVisible();
  await expectAccessible(page);

  // Plano sem IA: gerar o resumo devolve aviso, sem chamar nenhum modelo.
  await page.getByRole("button", { name: "Gerar resumo" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /não está disponível no seu plano|não foi configurada/ })).toBeVisible();
});
