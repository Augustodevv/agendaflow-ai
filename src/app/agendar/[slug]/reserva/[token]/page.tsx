export const instant = false;

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { formatCents } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/time";
import { cancelPublicBookingAction } from "@/modules/bookings/actions";
import { getBookingByToken } from "@/modules/bookings/service";

// Link secreto: não deve aparecer em buscadores nem vazar no Referer.
export const metadata: Metadata = { title: "Seu agendamento", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Page({ params, searchParams }: PageProps<"/agendar/[slug]/reserva/[token]">) {
  const { slug, token } = await params;
  const { nova } = await searchParams;
  const booking = await getBookingByToken(slug, token);
  if (!booking) notFound();

  const tz = booking.organization.timezone;
  const cancelled = booking.status === "CANCELLED";
  const canCancel = (booking.status === "CONFIRMED" || booking.status === "PENDING") && booking.startsAt > new Date();
  const title = cancelled ? "Agendamento cancelado" : nova ? "Horário reservado!" : "Seu agendamento";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <div aria-hidden className={`mx-auto grid size-14 place-items-center rounded-full text-2xl ${cancelled ? "bg-danger/10 text-danger" : "bg-brand/10 text-brand"}`}>
          {cancelled ? "×" : "✓"}
        </div>
        <h1 className="text-2xl font-semibold">{title}</h1>
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

      {nova && !cancelled && (
        <p className="rounded-lg bg-brand/5 px-4 py-3 text-center text-sm text-muted">
          Guarde este link: por ele você pode cancelar se não puder vir.
        </p>
      )}

      {canCancel && (
        <ActionForm action={cancelPublicBookingAction} confirmMessage="Cancelar este agendamento?" className="space-y-2 text-center">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="token" value={token} />
          <SubmitButton variant="ghost" pendingLabel="Cancelando..." className="w-full">
            Não vou poder ir, cancelar
          </SubmitButton>
        </ActionForm>
      )}

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
        {cancelled ? "Escolher outro horário" : "Fazer outro agendamento"}
      </Link>
    </main>
  );
}
