import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";

const plans = [
  {
    name: "Starter",
    price: "$19",
    audience: "Solo host",
    description: "For one operator who wants a calmer place to run property finances without losing the Excel migration path.",
    features: [
      "1 secure business workspace",
      "Excel import history plus native entries",
      "Dashboard, calendar, monthly and property views",
      "US, Spain, and UK market support",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    audience: "Growing operator",
    featured: true,
    description: "For hosts or co-hosts managing a larger portfolio and needing a more serious operating layer.",
    features: [
      "Everything in Starter",
      "Higher import volume and deeper historical reporting",
      "Multi-property operational workflow",
      "Priority product support",
    ],
  },
  {
    name: "Portfolio",
    price: "$99",
    audience: "Boutique manager",
    description: "For brands managing several homes or client accounts that want a premium finance workflow from day one.",
    features: [
      "Everything in Pro",
      "White-glove migration support",
      "Expanded onboarding help",
      "Priority roadmap access",
    ],
  },
];

const sharedInclusions = [
  "Google login with isolated business data per account",
  "Property-level structure for homes and optional units",
  "Import history with batch deletion and traceability",
  "Modern dark workspace designed around Hostlyx branding",
];

export default async function PricingPage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session?.user?.email);

  return (
    <>
      <MarketingHeader activePage="pricing" signedIn={signedIn} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-8 pt-8 sm:px-6 xl:px-8">
        <section className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
          <div className="card-surface rounded-[36px] p-8 sm:p-10 xl:p-12">
            <span className="brand-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
              <Sparkles className="h-3.5 w-3.5" />
              Pricing
            </span>

            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl">
              Simple pricing for operators who want a sharper financial system.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Start with one business and grow into a multi-property workflow without rebuilding your process later.
            </p>

            <div className="mt-8 rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Included in every plan</p>
              <div className="mt-4 grid gap-3">
                {sharedInclusions.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[20px] border border-white/8 bg-slate-950/35 px-4 py-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <p className="text-sm leading-6 text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="card-surface min-h-[420px] rounded-[36px] p-8 sm:p-10"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(7,17,28,0.16) 0%, rgba(7,17,28,0.92) 100%), url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="max-w-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-text)]/80">
                Built for premium rentals
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                The plan changes as your portfolio changes. The product language stays premium.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-200/90">
                You are not buying another admin panel. You are buying a calmer operating layer for hospitality finance.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-[34px] p-6 sm:p-7 ${
                plan.featured
                  ? "card-surface border-[color:var(--accent-soft-strong)] shadow-[0_24px_80px_rgba(88,196,182,0.14)]"
                  : "card-surface"
              }`}
            >
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
                  <div key={feature} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-text)]" />
                    <p className="text-sm leading-6 text-slate-200">{feature}</p>
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

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="card-surface rounded-[34px] p-8 sm:p-10">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">What changes across plans</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-100">
              More portfolio depth, not a different product.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Every plan stays inside the same Hostlyx experience. As you grow, you unlock more migration support, reporting depth, and operational scale.
            </p>
          </div>

          <div className="card-surface rounded-[34px] p-8 sm:p-10">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Want to see it first?</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-100">
              Walk the showroom before you commit.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Explore the product story, then come back to pricing once you know how Hostlyx fits your operation.
            </p>
            <Link
              href="/showcase"
              className="brand-button mt-8 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition"
            >
              Open showcase
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
