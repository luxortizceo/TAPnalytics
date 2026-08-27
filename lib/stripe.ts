import "server-only";
import Stripe from "stripe";

/**
 * Lazily-initialized Stripe client — null when STRIPE_SECRET_KEY isn't set,
 * so callers can render an honest "billing not configured" state instead of
 * crashing. Never hardcodes prices/amounts: those live in `plans`
 * (price_monthly/price_yearly) and are only mapped to the Stripe Price to
 * check out against via plans.stripe_price_id_monthly/_yearly.
 */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export function isStripeConfigured() {
  return stripe !== null;
}

export async function createCheckoutSession(input: {
  organizationId: string;
  organizationName: string;
  customerId: string | null;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  if (!stripe) throw new Error("Stripe no está configurado (STRIPE_SECRET_KEY).");

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: input.customerId ?? undefined,
    customer_creation: input.customerId ? undefined : "always",
    client_reference_id: input.organizationId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    subscription_data: { metadata: { organization_id: input.organizationId } },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { organization_id: input.organizationId, organization_name: input.organizationName },
  });
}

export async function createPortalSession(input: { customerId: string; returnUrl: string }) {
  if (!stripe) throw new Error("Stripe no está configurado (STRIPE_SECRET_KEY).");
  return stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl,
  });
}
