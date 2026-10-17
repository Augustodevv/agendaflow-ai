import Stripe from "stripe";

let client: Stripe | undefined;

/** Cliente do Stripe (somente servidor). Lança erro claro se a chave não estiver configurada. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada.");
  client ??= new Stripe(key);
  return client;
}
