import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Building2, ChartColumnBig, ShieldCheck, Sparkles } from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";

const highlights = [
  {
    title: "Import once, keep it forever",
    description: "Upload `Bookings` and `Expenses` from Excel and keep the data in your account instead of replacing it every time.",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    title: "Built for multiple hosts",
    description: "Every Google account has isolated data, its own business name, and its own currency preferences.",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    title: "Numbers owners actually use",
    description: "Gross revenue, net payout, expenses, ADR, occupancy, RevPAR, trends, and recent booking visibility in one place.",
    icon: <ChartColumnBig className="h-5 w-5" />,
  },
];

export default async function LandingPage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session?.user?.email);

  return (
    <>
      <MarketingHeader activePage="home" signedIn={signedIn} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-6 pt-8 sm:px-6 xl:px-8">
        <section className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="card-surface rounded-[34px] p-8 sm:p-10">
            <div className="max-w-3xl space-y-6">
              <span className="brand-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
                <Sparkles className="h-3.5 w-3.5" />
                Spreadsheet chaos, turned into SaaS
              </span>

              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl xl:text-6xl">
                  Accounting software for short-term rental hosts who are done living in Excel.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Hostlyx helps Airbnb and vacation-rental operators import bookings and expenses,
                  save them to the cloud, and instantly read the business through real dashboards.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
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

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Import sources</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-100">Excel + Manual</p>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Currencies</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-100">USD / EUR</p>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Audience</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-100">Hosts & PMs</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card-surface rounded-[34px] p-8 sm:p-10">
            <div className="grid gap-4">
              <div className="rounded-[26px] border border-white/8 bg-slate-950/30 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Demo workspace</p>
                    <p className="mt-2 text-xl font-semibold text-slate-100">PinarSabroso</p>
                  </div>
                  <div className="brand-pill rounded-2xl px-3 py-2 text-sm font-medium">
                    EUR
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Net profit</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-100">EUR 18.4K</p>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Occupancy</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-100">73.8%</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">Recent booking visibility</p>
                    <p className="mt-1 text-sm text-slate-400">Guest, dates, nights, guests, revenue, and payout without opening the spreadsheet.</p>
                  </div>
                  <BadgeDollarSign className="h-5 w-5 text-[var(--accent-text)]" />
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    ["John Rivera", "Mar 14 to Mar 18", "4 nights", "EUR 612 payout"],
                    ["Emma Scott", "Mar 22 to Mar 28", "6 nights", "EUR 924 payout"],
                    ["Carlos Diaz", "Apr 3 to Apr 7", "4 nights", "EUR 688 payout"],
                  ].map(([guest, stay, nights, payout]) => (
                    <div
                      key={`${guest}-${stay}`}
                      className="grid gap-2 rounded-[20px] border border-white/8 bg-slate-950/30 p-4 sm:grid-cols-[1fr_auto_auto]"
                    >
                      <div>
                        <p className="font-medium text-slate-100">{guest}</p>
                        <p className="mt-1 text-sm text-slate-400">{stay}</p>
                      </div>
                      <p className="text-sm text-slate-300">{nights}</p>
                      <p className="text-sm font-medium text-slate-100">{payout}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          {highlights.map((highlight) => (
            <article
              key={highlight.title}
              className="card-surface rounded-[30px] p-6"
            >
              <div className="brand-icon inline-flex rounded-2xl p-3">
                {highlight.icon}
              </div>
              <h2 className="mt-5 text-xl font-semibold text-slate-100">{highlight.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{highlight.description}</p>
            </article>
          ))}
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
