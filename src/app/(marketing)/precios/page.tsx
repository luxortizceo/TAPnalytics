import { PricingPlans } from "@/components/marketing/pricing-plans";
import { Faq } from "@/components/marketing/faq";

export const metadata = { title: "Precios" };

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight">Planes claros, sin sorpresas</h1>
            <p className="mt-4 text-muted-foreground">
              Todos los planes incluyen prueba gratuita. Cambia, cancela o mejora tu plan cuando
              quieras desde tu panel de facturación.
            </p>
          </div>
          <div className="mt-14">
            <PricingPlans />
          </div>
        </div>
      </section>
      <Faq />
    </>
  );
}
