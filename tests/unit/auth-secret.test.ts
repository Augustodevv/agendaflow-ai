import { describe, expect, it } from "vitest";
import { resolveAuthSecret } from "@/lib/auth-secret";

describe("resolveAuthSecret", () => {
  it("usa BETTER_AUTH_SECRET quando existe", () => {
    expect(resolveAuthSecret({ BETTER_AUTH_SECRET: "abc", DATABASE_URL: "postgres://x" })).toBe("abc");
  });

  it("sem segredo, deriva da conexão do banco e é estável", () => {
    const env = { POSTGRES_PRISMA_URL: "postgres://u:senha@host/db" };
    const a = resolveAuthSecret(env);
    expect(a).toBeTruthy();
    expect(a).toBe(resolveAuthSecret(env));
    expect(a).not.toContain("senha");
  });

  it("conexões diferentes geram segredos diferentes", () => {
    const a = resolveAuthSecret({ DATABASE_URL: "postgres://u:um@h/db" });
    const b = resolveAuthSecret({ DATABASE_URL: "postgres://u:dois@h/db" });
    expect(a).not.toBe(b);
  });

  it("sem nenhuma fonte, devolve undefined", () => {
    expect(resolveAuthSecret({})).toBeUndefined();
  });
});
