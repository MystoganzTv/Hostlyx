import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  ChartNoAxesCombined,
  FileSpreadsheet,
  LayoutPanelTop,
  WalletCards,
} from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";

const showcaseCards = [
  {
    title: "Migration intake",
    description:
      "Bring in workbook history when you need it, but keep Hostlyx positioned as the system where the data lives afterward.",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    title: "Operational calendar",
    description:
      "Read bookings, check-ins, check-outs, nights, guests, and closed days without jumping back into a spreadsheet tab.",
    icon: <CalendarRange className="h-5 w-5" />,
  },
  {
    title: "Executive reporting",
    description:
      "Gross revenue, payout, expenses, profit, occupancy, RevPAR, channel mix, and market-aware monthly reporting in one place.",
    icon: <ChartNoAxesCombined className="h-5 w-5" />,
  },
  {
    title: "Account isolation",
    description:
      "Each login keeps its own business, properties, imports, and settings, ready for a product you can sell to multiple operators.",
    icon: <WalletCards className="h-5 w-5" />,
  },
];

const productStory = [
  {
    title: "Clean intake",
    body: "Import workbooks only when needed, detect duplicates by content, and keep traceability in Import History.",
  },
  {
    title: "Beautiful control layer",
    body: "Move into a darker, calmer workspace with properties, bookings, expenses, markets, and profile settings.",
  },
  {
    title: "Portfolio clarity",
    body: "Track multiple homes across different countries while still respecting each market's real currency context.",
  },
];

export default async function ShowcasePage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session?.user?.email);

  return (
    <>
      <MarketingHeader activePage="showcase" signedIn={signedIn} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-8 pt-8 sm:px-6 xl:px-8">
        <section className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
          <div className="card-surface rounded-[36px] p-8 sm:p-10 xl:p-12">
            <span className="brand-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
              Showcase
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl">
              A showroom for what buyers actually get when they subscribe.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              This is the product story from first workbook import to a finance workspace that feels intentional, premium, and ready for a real rental operation.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={signedIn ? "/dashboard" : "/login"}
                className="brand-button inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                {signedIn ? "Open your workspace" : "Try Hostlyx"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="brand-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                View pricing
              </Link>
            </div>

            <div className="mt-10 grid gap-4">
              {productStory.map((step, index) => (
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

          <div className="grid gap-6">
            <div
              className="card-surface min-h-[260px] rounded-[34px] p-8"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(7,17,28,0.12) 0%, rgba(7,17,28,0.88) 100%), url('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="max-w-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-text)]/80">
                  Design direction
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  Premium hospitality visuals on the outside, serious financial clarity on the inside.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="card-surface rounded-[32px] p-6">
                <div className="flex items-center gap-3">
                  <LayoutPanelTop className="h-5 w-5 text-[var(--accent-text)]" />
                  <p className="text-lg font-semibold text-slate-100">Inside the app</p>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    "Dashboard, calendar, monthly, bookings, expenses, imports, properties, and profile routes",
                    "Guest names, stay dates, guest counts, nights, payouts, and richer calendar notes",
                    "Import history plus native editing, so the app becomes the working source of truth",
                  ].map((item) => (
                    <div key={item} className="rounded-[20px] border border-white/8 bg-slate-950/35 px-4 py-3 text-sm leading-6 text-slate-200">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="card-surface min-h-[280px] rounded-[32px] p-6"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, rgba(7,17,28,0.22) 0%, rgba(7,17,28,0.9) 100%), url('https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="max-w-xs">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-text)]/80">
                    Market-aware
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    Built for operators juggling different countries, currencies, and properties.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {showcaseCards.map((card) => (
            <article key={card.title} className="card-surface rounded-[30px] p-6 sm:p-7">
              <div className="brand-icon inline-flex rounded-2xl p-3">{card.icon}</div>
              <h2 className="mt-5 text-2xl font-semibold text-slate-100">{card.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{card.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <div
            className="card-surface min-h-[360px] rounded-[34px] p-8 sm:p-10"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(7,17,28,0.18) 0%, rgba(7,17,28,0.92) 100%), url('https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1400&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="max-w-md">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-text)]/80">
                Why this matters
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                The best version of Hostlyx feels like brand software, not a sheet converter.
              </p>
            </div>
          </div>

          <div className="card-surface rounded-[34px] p-8 sm:p-10">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ready to go deeper?</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-100">
              Pair this product story with pricing and a live dashboard.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Use the showroom to explain the offer, the pricing page to frame the value, and the live product to close the gap between promise and workflow.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="brand-button inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                See pricing
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={signedIn ? "/dashboard" : "/login"}
                className="brand-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                {signedIn ? "Open dashboard" : "Sign in"}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
