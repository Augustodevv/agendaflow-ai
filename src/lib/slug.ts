/** Converte um nome de negócio em slug de URL: "Barbearia do Zé" -> "barbearia-do-ze". */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const RESERVED = new Set(["admin", "api", "app", "entrar", "cadastro", "painel", "agendar", "precos"]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug);
}
