"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { can } from "@/lib/permissions";
import { createCheckoutSession, createPortalSession, isStripeConfigured } from "@/lib/stripe";

export type BillingActionState = { error?: string };

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function startCheckout(
  _prev: BillingActionState,
  formData: FormData
): Promise<BillingActionState> {
  const { current } = await getCurrentOrganization();
  if (!current || !can(current.role, "manage_billing")) {
    return { error: "No tienes permiso para gestionar la facturación." };
  }
  if (!isStripeConfigured()) {
    return { error: "Stripe no está configurado todavía en este entorno." };
  }

  const planId = formData.get("planId");
  const cycle = formData.get("cycle");
  if (typeof planId !== "string" || !planId) return { error: "Selecciona un plan." };

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("plans")
    .select("stripe_price_id_monthly, stripe_price_id_yearly")
    .eq("id", planId)
    .single();

  const priceId = cycle === "yearly" ? plan?.stripe_price_id_yearly : plan?.stripe_price_id_monthly;
  if (!priceId) return { error: "Este plan todavía no tiene un precio de Stripe configurado." };

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("organization_id", current.organization.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const session = await createCheckoutSession({
    organizationId: current.organization.id,
    organizationName: current.organization.name,
    customerId: existingSub?.provider_customer_id ?? null,
    priceId,
    successUrl: `${siteUrl()}/app/facturacion?checkout=success`,
    cancelUrl: `${siteUrl()}/app/facturacion?checkout=canceled`,
  });

  if (!session.url) return { error: "No pudimos iniciar el checkout." };
  redirect(session.url);
}

export async function openBillingPortal(
  _prev: BillingActionState,
  _formData: FormData
): Promise<BillingActionState> {
  const { current } = await getCurrentOrganization();
  if (!current || !can(current.role, "manage_billing")) {
    return { error: "No tienes permiso para gestionar la facturación." };
  }
  if (!isStripeConfigured()) {
    return { error: "Stripe no está configurado todavía en este entorno." };
  }

  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("organization_id", current.organization.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.provider_customer_id) return { error: "Todavía no hay un cliente de Stripe para esta empresa." };

  const session = await createPortalSession({
    customerId: sub.provider_customer_id,
    returnUrl: `${siteUrl()}/app/facturacion`,
  });
  redirect(session.url);
}
