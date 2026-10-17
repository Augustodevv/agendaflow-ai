import { timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/modules/notifications/reminders";

// Chamado de hora em hora pelo agendador (Vercel Cron ou outro), com o segredo no cabeçalho.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const authorized =
    Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!authorized) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const result = await sendDueReminders();
  return Response.json(result);
}
