import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";

const plans = [
  {
    name: "Starter",
    price: "$19",
    audience: "Solo host",
    description: "For hosts who want to move out of Excel and into a single clean dashboard.",
    features: [
      "1 business workspace",
      "Excel import history and native entries",
      "Dashboard, calendar, monthly, cashflow, and performance views",
      "US, Spain, and UK market support",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    audience: "Growing operator",
    featured: true,
    description: "For rental brands with more properties, more history, and more need for financial clarity.",
    features: [
      "Everything in Starter",
      "Higher import volume and deeper reporting",
      "More room for portfolio operations",
      "Priority support",
    ],
  },
  {
    name: "Portfolio",
    price: "$99",
    audience: "Boutique manager",
    description: "For operators managing several homes or client-facing hospitality portfolios.",
    features: [
      "Everything in Pro",
      "White-glove migration support",
      "Expanded onboarding help",
      "Priority roadmap access",
    ],
  },
];

export default async function PricingPage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session?.user?.email);

  return (
    <>
      <MarketingHeader activePage="pricing" signedIn={signedIn} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-8 pt-10 sm:px-6 xl:px-8">
        <section className="grid items-end gap-10 xl:grid-cols-[0.98fr_1.02fr]">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-text)]/80">Pricing</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl">
              Simple pricing for operators who want a better dashboard, not more spreadsheet maintenance.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Pick the level that matches your portfolio today and keep the same premium Hostlyx experience as the business grows.
            </p>
          </div>

          <div
            className="marketing-photo-panel min-h-[340px] rounded-[34px] p-8 sm:p-10"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="relative z-[1] max-w-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-text)]/80">
                Premium product, clear pricing
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                One product language across every tier.
              </p>
            </div>
          </div>
        </section>

        <div className="marketing-divider my-14" />

        <section className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={`marketing-panel rounded-[32px] px-6 py-7 ${plan.featured ? "shadow-[0_28px_70px_rgba(88,196,182,0.16)]" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]/85">
                    {plan.name}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{plan.audience}</p>
                </div>
                {plan.featured ? (
                  <span className="brand-pill rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                    Best fit
                  </span>
                ) : null}
              </div>

              <div className="mt-8">
                <p className="text-5xl font-semibold tracking-tight text-slate-100">{plan.price}</p>
                <p className="mt-2 text-sm text-slate-400">per month</p>
              </div>

              <p className="mt-6 text-sm leading-7 text-slate-300">{plan.description}</p>

              <div className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <p className="text-sm leading-7 text-slate-300">{feature}</p>
                  </div>
                ))}
              </div>

              <Link
                href={signedIn ? "/dashboard" : "/login"}
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  plan.featured ? "brand-button" : "brand-button-secondary"
                }`}
              >
                {signedIn ? "Go to workspace" : "Choose plan"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
