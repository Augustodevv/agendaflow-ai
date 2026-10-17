import { NextResponse } from "next/server";
import { processStripeEvent } from "@/modules/billing/service";
import { getStripe } from "@/modules/billing/stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Cobrança não configurada." }, { status: 503 });
  }
  if (!signature) return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });

  // O corpo precisa ser o texto bruto: a assinatura é calculada sobre ele.
  const body = await request.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  try {
    const result = await processStripeEvent(event);
    return NextResponse.json({ received: true, result });
  } catch (e) {
    console.error("[stripe] falha ao processar evento", event.id, event.type, e instanceof Error ? e.message : e);
    // 500 faz o Stripe repetir a entrega mais tarde.
    return NextResponse.json({ error: "Falha ao processar." }, { status: 500 });
  }
}
