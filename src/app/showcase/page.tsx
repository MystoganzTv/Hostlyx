import Link from "next/link";
import { CalendarRange, ChartNoAxesCombined, FileSpreadsheet, LayoutPanelTop, WalletCards } from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";

const showcaseCards = [
  {
    title: "Import layer",
    description: "Accepts Excel workbooks, reads only `Bookings` and `Expenses`, accumulates imports, and skips exact duplicates.",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    title: "Operational visibility",
    description: "Surface guest names, stay dates, nights, guest count, payouts, and recent expense notes without cleaning spreadsheets first.",
    icon: <CalendarRange className="h-5 w-5" />,
  },
  {
    title: "Executive dashboard",
    description: "Revenue, payout, expenses, profit, ADR, occupancy, RevPAR, channel mix, and monthly trends in one workspace.",
    icon: <ChartNoAxesCombined className="h-5 w-5" />,
  },
  {
    title: "Tenant-aware product",
    description: "Each user account keeps a separate business name, currency, imports, and manual records.",
    icon: <WalletCards className="h-5 w-5" />,
  },
];

export default async function ShowcasePage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session?.user?.email);

  return (
    <>
      <MarketingHeader activePage="showcase" signedIn={signedIn} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-6 pt-8 sm:px-6 xl:px-8">
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="card-surface rounded-[34px] p-8 sm:p-10">
            <span className="brand-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
              Showcase
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl">
              What buyers get when they subscribe.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              This is the product story: from a workbook upload to a saved, filterable workspace that understands the rental business.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={signedIn ? "/dashboard" : "/login"}
                className="brand-button rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                {signedIn ? "Open your dashboard" : "Try the app"}
              </Link>
              <Link
                href="/pricing"
                className="brand-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                See pricing
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="card-surface rounded-[30px] p-6">
              <div className="flex items-center gap-3">
                <LayoutPanelTop className="h-5 w-5 text-[var(--accent-text)]" />
                <p className="text-lg font-semibold text-slate-100">App flow</p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["Upload workbook", "Bookings + Expenses parsed and normalized"],
                  ["Save to account", "Imports persist in the cloud for that user only"],
                  ["Read the business", "Dashboards, activity, settings, and pricing-ready UX"],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="font-medium text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-surface rounded-[30px] p-6">
              <p className="text-lg font-semibold text-slate-100">Inside the workspace</p>
              <div className="mt-5 space-y-3">
                {[
                  "Dedicated dashboard route instead of one overloaded home screen",
                  "User profile with business name and currency",
                  "Recent bookings shown with guest, dates, guests, nights, revenue, and payout",
                  "Multi-tenant data isolation per Google account",
                ].map((item) => (
                  <div key={item} className="rounded-[20px] border border-white/8 bg-slate-950/30 px-4 py-3 text-sm text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {showcaseCards.map((card) => (
            <article key={card.title} className="card-surface rounded-[28px] p-6">
              <div className="brand-icon inline-flex rounded-2xl p-3">
                {card.icon}
              </div>
              <h2 className="mt-5 text-xl font-semibold text-slate-100">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{card.description}</p>
            </article>
          ))}
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
