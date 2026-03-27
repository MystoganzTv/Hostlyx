import Link from "next/link";
import {
  ArrowRight,
  ChartColumnBig,
  CircleCheckBig,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";

const pillars = [
  {
    title: "Know your real numbers",
    body: "Track revenue, expenses, margins, guests, nights, and payout without guessing what is actually left after fees.",
    icon: <ChartColumnBig className="h-5 w-5" />,
  },
  {
    title: "One account, one business",
    body: "Every operator sees only their own properties, imports, settings, and reporting context inside Hostlyx.",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    title: "Move beyond the workbook",
    body: "Import legacy Excel once, then manage the business from native data inside the product.",
    icon: <WalletCards className="h-5 w-5" />,
  },
];

const proofPoints = [
  "Revenue, expenses, and profit in a single beautiful dashboard.",
  "Calendar visibility for bookings, check-ins, check-outs, and closed days.",
  "Market-aware reporting for US, Spain, and UK properties.",
];

export default async function LandingPage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session?.user?.email);

  return (
    <>
      <MarketingHeader activePage="home" signedIn={signedIn} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-8 pt-10 sm:px-6 xl:px-8">
        <section className="grid items-start gap-10 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="max-w-3xl pt-4">
            <span className="brand-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
              <Sparkles className="h-3.5 w-3.5" />
              The financial operating system for short-term rental hosts
            </span>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl xl:text-6xl">
              Know your real numbers. Make better decisions.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Hostlyx brings revenue, expenses, and profit into a single, calm workspace so hosts can stop living in exports and start reading the business clearly.
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
                View showcase
              </Link>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Markets</p>
                <p className="mt-2 text-3xl font-semibold text-slate-100">US / ES / UK</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Source data</p>
                <p className="mt-2 text-3xl font-semibold text-slate-100">Excel + native</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Built for</p>
                <p className="mt-2 text-3xl font-semibold text-slate-100">Hosts & PMs</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div
              className="marketing-photo-panel min-h-[380px] rounded-[34px] p-8 sm:p-10"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1400&q=80')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="relative z-[1] max-w-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-text)]/80">
                  Premium hospitality outside
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  Premium financial clarity inside.
                </p>
              </div>
            </div>

            <div className="marketing-shell rounded-[30px] px-6 py-6 sm:px-7">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Inside Hostlyx</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Beautiful dashboard</p>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    Revenue, expenses, and profit after all fees and expenses. No more illusions.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Operational visibility</p>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    Guest names, stay dates, guests, nights, and calendar detail without opening the workbook again.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="marketing-divider my-14" />

        <section className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-text)]/80">
              Why it lands
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
              A dashboard that makes sense the moment you open it.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-300">
              The goal is not to recreate spreadsheet clutter inside the browser. The goal is to turn profit, expenses, and margins into something readable, calm, and actually useful.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {pillars.map((pillar) => (
              <article key={pillar.title}>
                <div className="brand-icon inline-flex rounded-2xl p-3">{pillar.icon}</div>
                <h3 className="mt-5 text-2xl font-semibold text-slate-100">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{pillar.body}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="marketing-divider my-14" />

        <section className="grid items-center gap-10 xl:grid-cols-[1.02fr_0.98fr]">
          <div
            className="marketing-photo-panel min-h-[420px] rounded-[34px] p-8 sm:p-10"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="relative z-[1] max-w-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-text)]/80">
                From spreadsheet chaos
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Into a workspace that knows what profitable rental operations need to see.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">What buyers care about</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
              Not just a converter. A source of truth.
            </h2>
            <p className="text-base leading-8 text-slate-300">
              Hostlyx is built so Excel becomes the bridge, not the destination. Once data lands in the app, the operator should feel no need to go back unless they want the backup trail.
            </p>

            <div className="space-y-4 pt-2">
              {proofPoints.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <CircleCheckBig className="mt-1 h-5 w-5 shrink-0 text-[var(--accent)]" />
                  <p className="text-sm leading-7 text-slate-300">{point}</p>
                </div>
              ))}
            </div>

            <div className="marketing-panel mt-6 rounded-[28px] px-6 py-6">
              <p className="text-sm leading-7 text-slate-300">
                Most hosts do not need more columns. They need a better place to see what happened, what is healthy, and what needs fixing next.
              </p>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
