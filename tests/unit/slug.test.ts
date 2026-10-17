import { describe, expect, it } from "vitest";
import { isReservedSlug, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("remove acentos e símbolos", () => {
    expect(slugify("Barbearia do Zé!")).toBe("barbearia-do-ze");
  });
  it("não deixa hífens nas pontas", () => {
    expect(slugify("  --Salão Bela--  ")).toBe("salao-bela");
  });
  it("retorna vazio para entrada sem letras", () => {
    expect(slugify("!!!")).toBe("");
  });
  it("bloqueia slugs reservados", () => {
    expect(isReservedSlug("api")).toBe(true);
    expect(isReservedSlug("barbearia-ze")).toBe(false);
  });
});
