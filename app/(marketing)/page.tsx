import Link from "next/link";
import { Hero } from "@/components/marketing/hero";
import { TapJourney } from "@/components/marketing/tap-journey";
import { Benefits, Sectors, Features, Cta } from "@/components/marketing/static-sections";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { Faq } from "@/components/marketing/faq";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TapJourney />
      <Benefits />
      <Sectors />
      <Features />
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-semibold tracking-tight">Planes para cada etapa</h2>
            <Link href="/precios" className="text-sm text-foreground underline underline-offset-4">
              Ver comparativa completa
            </Link>
          </div>
          <div className="mt-12">
            <PricingPlans />
          </div>
        </div>
      </section>
      <Faq />
      <Cta />
    </>
  );
}
