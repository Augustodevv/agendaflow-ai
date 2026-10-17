import { formatCents } from "@/lib/money";
import { PLANS, PAID_PLANS } from "@/modules/billing/plans";

const rows: { label: string; value: (p: (typeof PLANS)[keyof typeof PLANS]) => string }[] = [
  { label: "Profissionais", value: (p) => String(p.limits.maxStaff) },
  { label: "Página de reservas e agenda", value: () => "Sim" },
  { label: "Lembrete manual por WhatsApp", value: () => "Sim" },
  { label: "Lembrete automático por WhatsApp", value: (p) => (p.limits.autoReminders ? "Sim" : "Não") },
  { label: "Gerações de IA por mês", value: (p) => (p.limits.aiRequestsPerMonth ? String(p.limits.aiRequestsPerMonth) : "Não") },
];

/** Comparação de planos, gerada de PLANS: preço e limites mudam num lugar só. */
export function PlanTable() {
  const plans = ["FREE", ...PAID_PLANS] as const;
  return (
    <div tabIndex={0} role="region" aria-label="Comparação entre os planos" className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <caption className="sr-only">Comparação entre os planos</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="p-4 font-medium">
              <span className="sr-only">Recurso</span>
            </th>
            {plans.map((id) => (
              <th key={id} scope="col" className="p-4 align-top">
                <div className="font-semibold">{PLANS[id].name}</div>
                <div className="text-base font-semibold">
                  {PLANS[id].priceCents === 0 ? "R$ 0" : formatCents(PLANS[id].priceCents)}
                  {PLANS[id].priceCents > 0 && <span className="text-xs font-normal text-muted">/mês</span>}
                </div>
                <div className="mt-1 text-xs font-normal text-muted">{PLANS[id].tagline}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border last:border-0">
              <th scope="row" className="p-4 font-normal text-muted">
                {row.label}
              </th>
              {plans.map((id) => (
                <td key={id} className="p-4">
                  {row.value(PLANS[id])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
