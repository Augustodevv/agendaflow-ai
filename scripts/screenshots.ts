/**
 * Gera as capturas de tela do README com dados de demonstração (negócio fictício criado pela interface).
 * Uso: npm run build && npm run start (outro terminal) && npm run screenshots
 */
import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "docs/screenshots";
const id = Date.now();
const business = "Barbearia Exemplo";

const tomorrow = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 86_400_000));

async function book(page: Page, publicUrl: string, service: string, time: string, name: string, phone: string) {
  await page.goto(publicUrl);
  await page.getByRole("link", { name: new RegExp(service) }).click();
  await page.getByRole("link", { name: /amanhã/ }).click();
  await page.waitForURL(new RegExp(`data=${tomorrow()}`));
  await page.getByRole("link", { name: time, exact: true }).click();
  await page.getByLabel("Seu nome").fill(name);
  await page.getByLabel("WhatsApp").fill(phone);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();
  await page.getByRole("heading", { name: "Horário reservado!" }).waitFor();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/cadastro`);
  await page.getByLabel("Seu nome").fill("Dono Exemplo");
  await page.getByLabel("E-mail").fill(`demo-${id}@example.com`);
  await page.getByLabel("Senha").fill("senha-demo-123456");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do negócio").fill(business);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("heading", { name: "Início", level: 1 }).waitFor();

  await page.getByRole("link", { name: "Serviços", exact: true }).click();
  await page.waitForLoadState("networkidle");
  for (const [name, min, price] of [["Corte degradê", "30", "45,00"], ["Barba", "20", "30,00"], ["Corte + barba", "50", "70,00"]]) {
    await page.getByLabel("Nome").first().fill(name);
    await page.getByLabel("Duração (min)").first().fill(min);
    await page.getByLabel("Preço (R$)").first().fill(price);
    await page.getByRole("button", { name: "Adicionar serviço" }).click();
    await page.getByText(`${min} min · R$ ${price}`).waitFor();
  }

  await page.getByRole("link", { name: "Profissionais", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Novo profissional").fill("João");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByRole("link", { name: /João/ }).click();
  await page.waitForLoadState("networkidle");
  for (const day of ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]) {
    await page.getByRole("checkbox", { name: day }).check();
    await page.getByLabel(`${day}: início`, { exact: true }).fill("09:00");
    await page.getByLabel(`${day}: fim`, { exact: true }).fill("19:00");
  }
  await page.getByRole("button", { name: "Salvar jornada" }).click();
  await page.getByText("Jornada salva.").waitFor();

  await page.getByRole("link", { name: "Início" }).click();
  const publicUrl = (await page.getByRole("link", { name: /\/agendar\// }).getAttribute("href"))!;

  // Reservas de demonstração feitas pela página pública, como um cliente faria.
  const customer = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const mobile = await customer.newPage();
  await book(mobile, publicUrl, "Corte degradê", "10:00", "Carlos Silva", "11900000001");
  await book(mobile, publicUrl, "Barba", "11:00", "Rafael Souza", "11900000002");
  await book(mobile, publicUrl, "Corte \\+ barba", "15:00", "Bruno Lima", "11900000003");

  await mobile.goto(publicUrl);
  await mobile.screenshot({ path: `${OUT}/reserva-celular.png` });
  await mobile.getByRole("link", { name: /Corte degradê/ }).click();
  await mobile.getByRole("link", { name: /amanhã/ }).click();
  await mobile.waitForURL(new RegExp(`data=${tomorrow()}`));
  await mobile.waitForLoadState("networkidle");
  await mobile.mouse.move(0, 0);
  await mobile.waitForTimeout(500);
  await mobile.screenshot({ path: `${OUT}/reserva-horarios-celular.png` });

  await page.goto(`${BASE}/painel`);
  await page.getByRole("heading", { name: "Início", level: 1 }).waitFor();
  await page.screenshot({ path: `${OUT}/painel.png` });

  await page.goto(`${BASE}/painel/agenda?data=${tomorrow()}`);
  await page.getByText("Carlos Silva").waitFor();
  await page.screenshot({ path: `${OUT}/agenda.png` });

  await page.goto(`${BASE}/painel/assinatura`);
  await page.getByRole("heading", { name: "Assinatura", level: 1 }).waitFor();
  await page.screenshot({ path: `${OUT}/assinatura.png`, fullPage: true });

  await page.goto(`${BASE}/precos`);
  await page.screenshot({ path: `${OUT}/precos.png`, fullPage: true });

  await browser.close();
  console.log(`Capturas salvas em ${OUT}/`);
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
