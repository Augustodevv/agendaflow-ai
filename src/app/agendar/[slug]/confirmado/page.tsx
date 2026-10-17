export const instant = false;

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCents } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/time";
import { getPublicBooking } from "@/modules/bookings/service";

export const metadata: Metadata = { title: "Agendamento confirmado", robots: { index: false } };

export default async function Page({ params, searchParams }: PageProps<"/agendar/[slug]/confirmado">) {
  const { slug } = await params;
  const { id } = await searchParams;
  const booking = typeof id === "string" ? await getPublicBooking(slug, id) : null;
  if (!booking) notFound();
  const tz = booking.organization.timezone;
  const cancelled = booking.status === "CANCELLED";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <div aria-hidden className={`mx-auto grid size-14 place-items-center rounded-full text-2xl ${cancelled ? "bg-danger/10 text-danger" : "bg-brand/10 text-brand"}`}>
          {cancelled ? "×" : "✓"}
        </div>
        <h1 className="text-2xl font-semibold">{cancelled ? "Agendamento cancelado" : "Horário reservado!"}</h1>
        <p className="text-muted">{booking.organization.name}</p>
      </div>
      <dl className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
        {[
          ["Serviço", booking.service.name],
          ["Quando", `${formatDate(booking.startsAt, tz)} às ${formatTime(booking.startsAt, tz)}`],
          ["Com", booking.staff.name],
          ["Valor", `${formatCents(booking.priceCents)} (pago no local)`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {booking.organization.phone && !cancelled && (
        <a
          href={`https://wa.me/55${booking.organization.phone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border font-medium"
        >
          Precisa remarcar? Chame no WhatsApp
        </a>
      )}
      <Link href={`/agendar/${slug}`} className="text-center text-sm text-brand">
        Fazer outro agendamento
      </Link>
    </main>
  );
}
