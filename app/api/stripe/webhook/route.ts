import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus, InvoiceStatus } from "@/lib/supabase/types";

/**
 * Stripe webhook — the ONLY writer of `subscriptions`/`invoices` (see the
 * RLS comment in supabase/migrations/0004_rls_policies.sql: those tables
 * are select-only for org owners/admins). Runs with the service role since
 * Stripe calls this with no Supabase session.
 */

const STRIPE_STATUS_MAP: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "canceled",
  unpaid: "unpaid",
  paused: "canceled",
};

async function upsertSubscriptionFromStripe(admin: ReturnType<typeof createAdminClient>, sub: Stripe.Subscription) {
  const organizationId = sub.metadata?.organization_id;
  if (!organizationId) {
    console.error("[stripe webhook] subscription without organization_id metadata", sub.id);
    return;
  }

  const priceId = sub.items.data[0]?.price?.id;
  const { data: plan } = priceId
    ? await admin
        .from("plans")
        .select("id")
        .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
        .maybeSingle()
    : { data: null };

  const item = sub.items.data[0];
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("provider_subscription_id", sub.id)
    .maybeSingle();

  const row = {
    organization_id: organizationId,
    plan_id: plan?.id,
    status: STRIPE_STATUS_MAP[sub.status] ?? ("incomplete" as SubscriptionStatus),
    provider: "stripe" as const,
    provider_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    provider_subscription_id: sub.id,
    current_period_start: item ? new Date(item.current_period_start * 1000).toISOString() : null,
    current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
  };

  if (!row.plan_id) {
    console.error("[stripe webhook] no plan matches Stripe price", priceId);
    return;
  }

  if (existing) {
    await admin.from("subscriptions").update(row).eq("id", existing.id);
  } else {
    await admin.from("subscriptions").insert(row);
  }

  if (sub.status === "active" || sub.status === "trialing") {
    await admin.from("organizations").update({ status: "active" }).eq("id", organizationId);
  } else if (sub.status === "past_due") {
    await admin.from("organizations").update({ status: "past_due" }).eq("id", organizationId);
  } else if (sub.status === "canceled" || sub.status === "unpaid") {
    await admin.from("organizations").update({ status: "canceled" }).eq("id", organizationId);
  }
}

const STRIPE_INVOICE_STATUS_MAP: Record<string, InvoiceStatus> = {
  draft: "draft",
  open: "open",
  paid: "paid",
  void: "void",
  uncollectible: "uncollectible",
};

async function upsertInvoiceFromStripe(admin: ReturnType<typeof createAdminClient>, invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof invoice.parent?.subscription_details?.subscription === "string"
      ? invoice.parent.subscription_details.subscription
      : null;
  const organizationId = invoice.metadata?.organization_id;

  let organizationDbId = organizationId ?? null;
  let subscriptionDbId: string | null = null;
  if (subscriptionId) {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, organization_id")
      .eq("provider_subscription_id", subscriptionId)
      .maybeSingle();
    if (sub) {
      subscriptionDbId = sub.id;
      organizationDbId = organizationDbId ?? sub.organization_id;
    }
  }
  if (!organizationDbId) {
    console.error("[stripe webhook] invoice without resolvable organization", invoice.id);
    return;
  }

  const { data: existing } = await admin
    .from("invoices")
    .select("id")
    .eq("provider_invoice_id", invoice.id)
    .maybeSingle();

  const row = {
    organization_id: organizationDbId,
    subscription_id: subscriptionDbId,
    provider_invoice_id: invoice.id,
    amount_due: invoice.amount_due / 100,
    amount_paid: invoice.amount_paid / 100,
    currency: invoice.currency.toUpperCase(),
    status: STRIPE_INVOICE_STATUS_MAP[invoice.status ?? "draft"] ?? "draft",
    invoice_pdf_url: invoice.invoice_pdf ?? null,
    period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString().slice(0, 10) : null,
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString().slice(0, 10) : null,
  };

  if (existing) await admin.from("invoices").update(row).eq("id", existing.id);
  else await admin.from("invoices").insert(row);
}

export async function POST(request: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "Stripe no está configurado." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Falta la firma." }, { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe webhook] invalid signature", err);
    return Response.json({ error: "Firma inválida." }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (typeof session.subscription === "string") {
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        if (!sub.metadata?.organization_id && session.client_reference_id) {
          sub.metadata.organization_id = session.client_reference_id;
        }
        await upsertSubscriptionFromStripe(admin, sub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await upsertSubscriptionFromStripe(admin, event.data.object);
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.finalized": {
      await upsertInvoiceFromStripe(admin, event.data.object);
      break;
    }
    default:
      break;
  }

  return Response.json({ received: true });
}
