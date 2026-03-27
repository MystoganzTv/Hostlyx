import Link from "next/link";
import { ArrowRight, CircleCheckBig, Sparkles } from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";

const problemPoints = [
  "You see revenue, but not real profit.",
  "Expenses are buried across spreadsheets and notes.",
  "You do not know where the business is leaking money.",
];

const productPoints = [
  "Upload your data and see a financial overview immediately.",
  "Track profit, revenue, expenses, and margin in one place.",
  "Understand performance over time without spreadsheet cleanup.",
];

export default async function LandingPage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session?.user?.email);

  return (
    <>
      <MarketingHeader activePage="home" signedIn={signedIn} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-10 sm:px-6 xl:px-8">
        <section className="grid items-center gap-12 xl:grid-cols-[0.96fr_1.04fr]">
          <div className="max-w-3xl">
            <span className="brand-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
              <Sparkles className="h-3.5 w-3.5" />
              Financial command center for rental operators
            </span>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl xl:text-6xl">
              Run your rental business like a company.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Hosts should not have to guess whether the business is actually making money. Hostlyx turns messy booking and expense data into clear financial answers.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={signedIn ? "/dashboard" : "/login"}
                className="brand-button inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                {signedIn ? "Upload your data" : "Upload your data"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/showcase"
                className="brand-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                View dashboard preview
              </Link>
            </div>

            <div className="mt-10 space-y-4">
              {problemPoints.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <CircleCheckBig className="mt-1 h-5 w-5 shrink-0 text-rose-300" />
                  <p className="text-sm leading-7 text-slate-300">{point}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="marketing-panel rounded-[34px] p-6 sm:p-7">
            <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(14,26,44,0.98)_0%,rgba(8,17,30,0.96)_100%)] p-5 shadow-[0_24px_60px_rgba(2,6,23,0.26)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Hostlyx preview</p>
                  <p className="mt-2 text-xl font-semibold text-slate-100">Financial overview</p>
                </div>
                <span className="rounded-full bg-emerald-400/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Profit first
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-[1.25fr_0.75fr_0.75fr]">
                <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(29,78,60,0.28)_0%,rgba(11,29,24,0.88)_100%)] p-5 ring-1 ring-emerald-300/18">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">
                    Net Profit
                  </p>
                  <p className="mt-4 text-4xl font-semibold tracking-tight text-white">€9,654</p>
                  <p className="mt-3 text-sm text-emerald-100/80">Your clearest answer to whether the business is really working.</p>
                </div>
                <div className="rounded-[24px] bg-white/[0.04] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Revenue</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-100">€46,857</p>
                </div>
                <div className="rounded-[24px] bg-white/[0.04] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Expenses</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-100">€37,203</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.06fr_0.94fr]">
                <div className="rounded-[24px] bg-white/[0.04] p-5">
                  <div className="flex items-end justify-between gap-3">
                    {[
                      ["Jan", 34],
                      ["Feb", 48],
                      ["Mar", 58],
                      ["Apr", 62],
                      ["May", 55],
                      ["Jun", 76],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex flex-1 flex-col items-center gap-3">
                        <div className="flex h-32 w-full items-end">
                          <div
                            className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,rgba(88,196,182,0.95)_0%,rgba(56,146,133,0.92)_100%)]"
                            style={{ height: `${value}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-slate-400">Profit over time</p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] bg-white/[0.04] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Profit Margin</p>
                    <p className="mt-4 text-3xl font-semibold text-slate-100">20.6%</p>
                  </div>
                  <div className="rounded-[24px] bg-white/[0.04] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Expense Drain</p>
                    <p className="mt-4 text-base leading-7 text-slate-300">
                      Utilities, cleaning, mortgage and host fees are the biggest cost drivers this month.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="marketing-divider my-14" />

        <section className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-text)]/80">Why Hostlyx exists</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
              Revenue is not enough. Profit is what matters.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-300">
              The dashboard should answer three things instantly: are you making money, where is it going, and how is the business performing over time.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {productPoints.map((point) => (
              <div key={point}>
                <p className="text-lg font-semibold text-slate-100">{point.split(" and ")[0]}</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">{point}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
