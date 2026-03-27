import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  ChartColumnBig,
  CircleCheckBig,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";

const featureCards = [
  {
    title: "A calmer way to read the business",
    description:
      "Revenue, payout, expenses, guests, nights, occupancy, and month-by-month performance in one place that feels like software instead of bookkeeping cleanup.",
    icon: <ChartColumnBig className="h-5 w-5" />,
  },
  {
    title: "One workspace per operator",
    description:
      "Each Google account keeps its own properties, imports, settings, and currency context. Your portfolio stays yours, and your client's stays theirs.",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    title: "Migrate once, manage forever",
    description:
      "Excel is only the bridge. Once records land in Hostlyx, they become native data you can edit, filter, and report on without returning to the sheet.",
    icon: <Building2 className="h-5 w-5" />,
  },
];

const operatingSystemSteps = [
  {
    title: "Bring in legacy history",
    body: "Upload the workbook when you need to migrate past bookings, expenses, and calendar notes into your account.",
  },
  {
    title: "Organize by market and property",
    body: "Keep USA, Spain, and UK properties inside one operator login without blurring ownership or currency context.",
  },
  {
    title: "Run the business from Hostlyx",
    body: "Move to manual entries, monthly review, calendar operations, and import history only when you need traceability.",
  },
];

const editorialNotes = [
  "Built for hosts, co-hosts, and boutique property managers who need clarity faster than they need another spreadsheet tab.",
  "Balances owner-level reporting with day-to-day operational context like guests, nights, channel mix, and closures.",
  "Designed to feel premium and calm, so the financial side of hospitality looks as polished as the stay itself.",
];

export default async function LandingPage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session?.user?.email);

  return (
    <>
      <MarketingHeader activePage="home" signedIn={signedIn} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-8 pt-8 sm:px-6 xl:px-8">
        <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
          <div className="card-surface rounded-[36px] p-8 sm:p-10 xl:p-12">
            <div className="max-w-3xl">
              <span className="brand-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
                <Sparkles className="h-3.5 w-3.5" />
                The finance layer for premium rental brands
              </span>

              <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl xl:text-6xl">
                Built for hosts who want their numbers to feel as polished as their guest experience.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Hostlyx turns scattered booking exports, expense logs, and market-by-market properties into one calm operating system for short-term rental finance.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={signedIn ? "/dashboard" : "/login"}
                  className="brand-button inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition"
                >
                  {signedIn ? "Open dashboard" : "Start with Google"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/showcase"
                  className="brand-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition"
                >
                  Explore the showroom
                </Link>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Markets</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-100">US / ES / UK</p>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Source data</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-100">Excel + native</p>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Best fit</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-100">Hosts & PMs</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div
              className="card-surface relative overflow-hidden rounded-[36px] p-6 sm:p-7"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(8,17,28,0.18) 0%, rgba(8,17,28,0.88) 100%), url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1400&q=80')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="relative max-w-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-text)]/80">
                  Boutique hospitality energy
                </p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  A premium brand outside should be matched by premium reporting inside.
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-200/90">
                  Keep the tone elevated from landing page to workspace, without losing operational depth.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[1.02fr_0.98fr]">
              <div className="card-surface rounded-[32px] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Demo snapshot</p>
                    <p className="mt-2 text-xl font-semibold text-slate-100">HomeXperience Coastal</p>
                  </div>
                  <div className="brand-pill rounded-2xl px-3 py-2 text-sm font-medium">EUR</div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/8 bg-slate-950/35 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Net profit</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-100">EUR 18.4K</p>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-slate-950/35 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total guests</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-100">214</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    ["Payouts", "Channel mix and owner-ready reporting"],
                    ["Calendar", "Check-ins, check-outs, and closed days"],
                    ["Imports", "Workbook traceability without living in the sheet"],
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-sm font-semibold text-slate-100">{title}</p>
                      <p className="mt-1 text-sm text-slate-400">{body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="card-surface min-h-[320px] rounded-[32px] p-6"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, rgba(7,17,28,0.24) 0%, rgba(7,17,28,0.9) 100%), url('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="max-w-xs">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-text)]/80">
                    Multi-property ready
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    Switch between homes, units, and markets without losing the thread.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          {featureCards.map((feature) => (
            <article key={feature.title} className="card-surface rounded-[32px] p-6 sm:p-7">
              <div className="brand-icon inline-flex rounded-2xl p-3">{feature.icon}</div>
              <h2 className="mt-5 text-2xl font-semibold text-slate-100">{feature.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
          <div
            className="card-surface min-h-[420px] rounded-[36px] p-8 sm:p-10"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(8,17,28,0.24) 0%, rgba(8,17,28,0.92) 100%), url('https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="max-w-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-text)]/80">
                From sheet to system
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Hostlyx is meant to become the place you work, not just the place you import into.
              </p>
            </div>
          </div>

          <div className="card-surface rounded-[36px] p-8 sm:p-10">
            <div className="max-w-2xl">
              <span className="brand-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
                Operating system
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
                The right workflow is simple: migrate once, then stay inside the product.
              </h2>
            </div>

            <div className="mt-8 space-y-4">
              {operatingSystemSteps.map((step, index) => (
                <div key={step.title} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-start gap-4">
                    <div className="brand-icon inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold">
                      0{index + 1}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-100">{step.title}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-400">{step.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="card-surface rounded-[36px] p-8 sm:p-10">
            <div className="flex items-center gap-3">
              <BadgeDollarSign className="h-5 w-5 text-[var(--accent-text)]" />
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]/90">
                Why operators buy
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              {editorialNotes.map((note) => (
                <div key={note} className="rounded-[24px] border border-white/8 bg-slate-950/35 p-5">
                  <div className="flex items-start gap-3">
                    <CircleCheckBig className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" />
                    <p className="text-sm leading-7 text-slate-300">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-surface rounded-[36px] p-8 sm:p-10">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Next step</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-100">
              See the product story before you buy.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Walk through the showroom, then check pricing when you are ready to turn an Excel-heavy operation into a proper finance workspace.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/showcase"
                className="brand-button inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                View showcase
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="brand-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                Review pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
