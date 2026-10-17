import { describe, expect, it } from "vitest";
import { appUrl, requestOrigin, trustedOrigins } from "@/lib/app-url";

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

describe("trustedOrigins", () => {
  const vercel = {
    VERCEL_ENV: "production",
    VERCEL_GIT_REPO_SLUG: "agendaflow-ai",
    VERCEL_URL: "agendaflow-ai-abc123xyz-augusto-7334.vercel.app",
    VERCEL_PROJECT_PRODUCTION_URL: "agendaflow-ai-augusto-7334.vercel.app",
  };

  it("aceita o alias do time, o deploy e os previews do próprio projeto", () => {
    const list = trustedOrigins(vercel);
    expect(list).toContain("https://agendaflow-ai-augusto-7334.vercel.app");
    expect(list).toContain("https://agendaflow-ai-abc123xyz-augusto-7334.vercel.app");
    expect(list).toContain("https://agendaflow-ai-*-augusto-7334.vercel.app");
  });

  it("não aceita domínios de outros projetos", () => {
    const list = trustedOrigins(vercel);
    expect(list).not.toContain("https://agendaflow-ai.vercel.app");
    expect(list.some((o) => o.includes("evil"))).toBe(false);
  });

  it("fora da Vercel, só a URL configurada", () => {
    expect(trustedOrigins({ NEXT_PUBLIC_APP_URL: "https://exemplo.com" })).toEqual(["https://exemplo.com"]);
  });
});

describe("requestOrigin", () => {
  it("usa o host que o navegador usou", () => {
    const req = new Request("https://interno.local/api/auth/x", { headers: { host: "meu-site.vercel.app", "x-forwarded-proto": "https" } });
    expect(requestOrigin(req)).toBe("https://meu-site.vercel.app");
  });

  it("prefere x-forwarded-host quando existe", () => {
    const req = new Request("http://interno/x", { headers: { "x-forwarded-host": "publico.com", "x-forwarded-proto": "https" } });
    expect(requestOrigin(req)).toBe("https://publico.com");
  });

  it("sem requisição, devolve null", () => {
    expect(requestOrigin(undefined)).toBeNull();
  });
});
