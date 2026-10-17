import { describe, expect, it } from "vitest";
import { appUrl } from "@/lib/app-url";

describe("appUrl", () => {
  it("em produção na Vercel usa o domínio informado pela plataforma, ignorando a variável digitada", () => {
    expect(
      appUrl({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "meu-site.vercel.app", NEXT_PUBLIC_APP_URL: "https://errado.com" }),
    ).toBe("https://meu-site.vercel.app");
  });

  it("em preview usa a URL do deploy", () => {
    expect(appUrl({ VERCEL_ENV: "preview", VERCEL_URL: "meu-site-abc.vercel.app" })).toBe("https://meu-site-abc.vercel.app");
  });

  it("fora da Vercel usa NEXT_PUBLIC_APP_URL sem barra no final", () => {
    expect(appUrl({ NEXT_PUBLIC_APP_URL: "https://exemplo.com/" })).toBe("https://exemplo.com");
  });

  it("sem nada configurado, usa localhost", () => {
    expect(appUrl({})).toBe("http://localhost:3000");
  });
});
