"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { requireOrg } from "@/lib/session";
import { isBillingEnabled, isPaidPlan, stripePriceId } from "./plans";
import { createCheckoutUrl, createPortalUrl } from "./service";

const UNAVAILABLE: ActionState = { error: "A cobrança ainda não está ativa neste ambiente." };
const FAILED: ActionState = { error: "Não foi possível abrir o pagamento agora. Tente novamente." };

export async function checkoutAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { organization, user, role } = await requireOrg();
  if (role !== "OWNER") return { error: "Só o dono do negócio pode alterar a assinatura." };
  if (!isBillingEnabled()) return UNAVAILABLE;

  const plan = formData.get("plan");
  if (!isPaidPlan(plan)) return { error: "Plano inválido." };
  const priceId = stripePriceId(plan);
  if (!priceId) return UNAVAILABLE;

  let url: string;
  try {
    url = await createCheckoutUrl(organization, user.email, priceId, plan);
  } catch (e) {
    console.error("[billing] checkout falhou", organization.id, e instanceof Error ? e.message : e);
    return FAILED;
  }
  redirect(url);
}

export async function portalAction(): Promise<ActionState> {
  const { organization, role } = await requireOrg();
  if (role !== "OWNER") return { error: "Só o dono do negócio pode alterar a assinatura." };
  if (!isBillingEnabled()) return UNAVAILABLE;
  if (!organization.stripeCustomerId) return { error: "Você ainda não tem assinatura." };

  let url: string;
  try {
    url = await createPortalUrl(organization.stripeCustomerId);
  } catch (e) {
    console.error("[billing] portal falhou", organization.id, e instanceof Error ? e.message : e);
    return FAILED;
  }
  redirect(url);
}
