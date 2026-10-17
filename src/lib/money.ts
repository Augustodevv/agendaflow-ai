const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 4500 -> "R$ 45,00" */
export function formatCents(cents: number): string {
  return brl.format(cents / 100);
}

/** "45", "45,90", "1.234,50" -> centavos; retorna null se inválido. */
export function parseBRL(value: string): number | null {
  const clean = value.replace(/R\$|\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}
