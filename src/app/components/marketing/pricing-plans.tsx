import Link from "next/link";
import { getActivePlans } from "@/lib/data/plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

function formatPrice(amount: number | null, currency: string) {
  if (amount === null) return "Personalizado";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amount
  );
}

export async function PricingPlans() {
  const plans = await getActivePlans();

  if (!plans) {
    return (
      <div className="rounded-lg border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
        No pudimos cargar los planes en este momento. Configura la conexión a Supabase o{" "}
        <Link href="/demo" className="underline underline-offset-4">
          contacta a ventas
        </Link>
        .
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
        Aún no hay planes publicados.
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan, i) => (
        <div
          key={plan.id}
          className={`flex flex-col rounded-lg border p-6 ${
            i === 1 ? "border-accent/50 bg-surface" : "border-border bg-surface"
          }`}
        >
          {i === 1 && (
            <Badge variant="accent" className="mb-4 w-fit">
              Más popular
            </Badge>
          )}
          <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
          <div className="mt-6 flex items-baseline gap-1">
            <span className="text-3xl font-semibold tracking-tight">
              {formatPrice(plan.price_monthly, plan.currency)}
            </span>
            {plan.price_monthly !== null && (
              <span className="text-sm text-muted-foreground">/ mes</span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.trial_days} días de prueba gratuita
          </p>
          <ul className="mt-6 flex flex-1 flex-col gap-3">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-positive" />
                {feature}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-8" variant={i === 1 ? "default" : "secondary"}>
            <Link href={plan.price_monthly === null ? "/demo" : "/registro"}>
              {plan.price_monthly === null ? "Hablar con ventas" : "Comenzar prueba"}
            </Link>
          </Button>
        </div>
      ))}
    </div>
  );
}
