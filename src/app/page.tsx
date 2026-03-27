import Link from "next/link";
import {
  ArrowDownUp,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleCheckBig,
  Eye,
  FileSpreadsheet,
  GitCompare,
  LayoutDashboard,
  PiggyBank,
  Play,
  Tags,
  TrendingDown,
} from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { getOnboardingState } from "@/lib/onboarding";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";

const heroImage =
  "https://media.base44.com/images/public/69c6f86f5aab8f97e00c6c1d/bdd7ed6cb_generated_53cf32da.png";
const dashboardImage =
  "https://media.base44.com/images/public/69c6f86f5aab8f97e00c6c1d/714134a36_generated_db69c040.png";
const hostAvatars = [
  "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=64&h=64&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face",
];

const problems = [
  {
    icon: TrendingDown,
    title: "Ingresos ≠ beneficio",
    description:
      "Un año con muchas reservas puede parecer bueno, pero sin gastos, comisiones e impuestos no sabes lo que realmente ganas.",
    stat: "67%",
    statLabel: "de hosts sobrestiman su beneficio",
  },
  {
    icon: FileSpreadsheet,
    title: "Datos dispersos por todos lados",
    description:
      "Extractos, facturas, Excel, notas y plataformas distintas terminan rompiendo tu historia financiera en demasiados sitios.",
    stat: "4+",
    statLabel: "herramientas para entender el negocio",
  },
  {
    icon: Eye,
    title: "Cero visibilidad real",
    description:
      "Sin ocupación, ADR, RevPAR, margen y cashflow claros, muchas decisiones se terminan tomando por intuición.",
    stat: "82%",
    statLabel: "sin métricas realmente accionables",
  },
];

const features = [
  {
    icon: LayoutDashboard,
    title: "Dashboard con claridad total",
    description: "Todas tus métricas clave de un vistazo: ingresos, beneficio, gastos y márgenes.",
  },
  {
    icon: BarChart3,
    title: "Rendimiento mensual",
    description: "Visualiza cómo evoluciona tu negocio mes a mes con tendencias claras.",
  },
  {
    icon: Tags,
    title: "Categorización de gastos",
    description: "Clasifica limpieza, mantenimiento, suministros, utilities y más sin perder el contexto.",
  },
  {
    icon: GitCompare,
    title: "Ingresos por canal",
    description: "Compara Airbnb, Booking y directo para ver qué canal aporta más valor real.",
  },
  {
    icon: PiggyBank,
    title: "Beneficio real, no ilusión",
    description: "Ingresos menos comisiones menos gastos: la cifra que importa, sin autoengaños.",
  },
  {
    icon: ArrowDownUp,
    title: "Control de cashflow",
    description: "Entiende cuándo entra y sale el dinero para operar con más confianza.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    tagline: "Para una propiedad",
    price: 19,
    description:
      "Un punto de partida sencillo para hosts que quieren claridad sin añadir complejidad.",
    features: ["1 propiedad", "Importación Excel", "Dashboard completo", "Estimación fiscal"],
    highlighted: false,
  },
  {
    name: "Pro",
    tagline: "Para operadores en crecimiento",
    price: 49,
    description:
      "La mejor opción para hosts que gestionan más de una propiedad y quieren mayor visibilidad.",
    features: ["Múltiples propiedades", "Informes avanzados", "Insights de rendimiento", "Soporte prioritario"],
    highlighted: true,
    badge: "Más popular",
  },
  {
    name: "Portfolio",
    tagline: "Para carteras grandes",
    price: 99,
    description:
      "Diseñado para operadores que necesitan escala, analítica profunda y más de un usuario.",
    features: ["Propiedades ilimitadas", "Analítica avanzada", "Funciones de equipo", "API access"],
    highlighted: false,
  },
];

export default async function LandingPage() {
  const session = await getAuthSession();
  const signedIn = Boolean(session?.user?.email);
  const dashboardHref =
    signedIn && session?.user?.email
      ? (await getOnboardingState(session.user.email.toLowerCase(), session.user.name ?? session.user.email)).isComplete
        ? "/dashboard"
        : "/onboarding"
      : "/login";

  return (
    <>
      <MarketingHeader activePage="home" signedIn={signedIn} />

      <main className="pb-16">
        <section id="hero" className="relative min-h-screen overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Luxury vacation rental"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(7,17,28,0.98)] via-[rgba(7,17,28,0.95)] to-[rgba(7,17,28,0.6)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(7,17,28,0.98)] via-transparent to-[rgba(7,17,28,0.4)]" />
          </div>

          <div className="relative z-[1] mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 pb-20 pt-32 sm:px-6 xl:px-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft-strong)] bg-[var(--accent-soft)] px-4 py-1.5">
                <div className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent-text)]">
                  Sistema financiero para hosts
                </span>
              </div>

              <h1 className="mt-8 text-4xl font-bold leading-[1.05] tracking-tight text-slate-100 sm:text-5xl lg:text-6xl xl:text-7xl">
                Conoce el <span className="text-[var(--accent)]">beneficio real</span> de tu alquiler vacacional.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl">
                Deja de adivinar tus números. Hostlyx convierte reservas, gastos e ingresos dispersos en
                claridad financiera total para que operes como negocio, no como improvisación.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href={dashboardHref}
                  className="brand-button inline-flex h-13 items-center justify-center gap-2 rounded-2xl px-8 text-base font-semibold transition"
                >
                  Empieza gratis
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#solution"
                  className="brand-button-secondary inline-flex h-13 items-center justify-center gap-2 rounded-2xl px-8 text-base font-semibold transition"
                >
                  <Play className="h-4 w-4" />
                  Ver demo
                </Link>
              </div>

              <div className="mt-12 flex items-center gap-6">
                <div className="flex -space-x-2">
                  {hostAvatars.map((url, index) => (
                    <img
                      key={url}
                      src={url}
                      alt={`Host ${index + 1}`}
                      className="h-8 w-8 rounded-full border-2 border-[var(--background)] object-cover"
                    />
                  ))}
                </div>

                <div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <svg
                        key={index}
                        className="h-3.5 w-3.5 fill-[var(--accent)] text-[var(--accent)]"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Usado por +200 hosts en España</p>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[var(--background)] to-transparent" />
        </section>

        <section id="problem" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 sm:py-28 xl:px-8">
          <div className="text-center">
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--accent-text)]">
              El problema
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-slate-100 sm:text-4xl lg:text-5xl">
              Los spreadsheets no fueron hechos para negocios de alquiler.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {problems.map((problem) => {
              const Icon = problem.icon;

              return (
                <article
                  key={problem.title}
                  className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,23,39,0.76)_0%,rgba(8,17,28,0.62)_100%)] p-8"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--accent-soft-strong)] bg-[var(--accent-soft)]">
                    <Icon className="h-5 w-5 text-[var(--accent-text)]" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-slate-100">{problem.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{problem.description}</p>
                  <div className="mt-6 border-t border-white/8 pt-6">
                    <p className="text-3xl font-semibold tracking-[-0.04em] text-[var(--accent)]">{problem.stat}</p>
                    <p className="mt-1 text-xs text-slate-500">{problem.statLabel}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="solution" className="relative overflow-hidden py-24 sm:py-28">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-soft)] blur-3xl" />

          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 xl:px-8">
            <div className="text-center">
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--accent-text)]">
                La solución
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-slate-100 sm:text-4xl lg:text-5xl">
                Tu centro de mando financiero.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                Importa desde Airbnb, Booking o tu Excel actual. Hostlyx unifica todo en un solo lugar donde
                cada número tiene sentido.
              </p>
            </div>

            <div className="relative mt-16">
              <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,28,44,0.92)_0%,rgba(11,22,37,0.98)_100%)] shadow-[0_28px_80px_rgba(2,6,23,0.3)]">
                <div className="flex items-center gap-2 border-b border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-400/40" />
                    <div className="h-3 w-3 rounded-full bg-amber-300/40" />
                    <div className="h-3 w-3 rounded-full bg-[var(--accent)]/40" />
                  </div>
                  <div className="mx-4 flex-1">
                    <div className="mx-auto max-w-xs rounded-lg bg-white/[0.04] px-4 py-1.5 text-center text-xs text-slate-400">
                      hostlyx1.netlify.app/dashboard
                    </div>
                  </div>
                </div>

                <img
                  src={dashboardImage}
                  alt="Hostlyx dashboard financiero"
                  className="w-full"
                />
              </div>

              <div className="absolute -left-4 top-1/3 hidden lg:block">
                <div className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(17,28,44,0.96)_0%,rgba(11,22,37,0.96)_100%)] p-4 shadow-[0_20px_40px_rgba(2,6,23,0.24)]">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Beneficio neto</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">€9,654</p>
                  <div className="mt-2 flex items-center gap-1">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-soft)]">
                      <span className="text-[8px] text-[var(--accent)]">↑</span>
                    </div>
                    <span className="text-xs text-[var(--accent)]">+18%</span>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 top-1/4 hidden lg:block">
                <div className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(17,28,44,0.96)_0%,rgba(11,22,37,0.96)_100%)] p-4 shadow-[0_20px_40px_rgba(2,6,23,0.24)]">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Ocupación</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-100">73.8%</p>
                  <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.08]">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: "73.8%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link
                href={dashboardHref}
                className="brand-button inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold transition"
              >
                Pruébalo gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 sm:py-28 xl:px-8">
          <div className="text-center">
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--accent-text)]">
              Funcionalidades
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-slate-100 sm:text-4xl lg:text-5xl">
              Todo lo que necesitas para <span className="text-[var(--accent)]">rentabilizar tu alquiler.</span>
            </h2>
          </div>

          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="group rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,23,39,0.74)_0%,rgba(8,17,28,0.6)_100%)] p-6 transition-all duration-300 hover:border-[var(--accent)]/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--accent-soft-strong)] bg-[var(--accent-soft)] transition-colors group-hover:bg-[rgba(88,196,182,0.22)]">
                      <Icon className="h-4 w-4 text-[var(--accent-text)]" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">{feature.title}</h3>
                      <p className="mt-1.5 text-sm leading-7 text-slate-400">{feature.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="pricing" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 sm:py-28 xl:px-8">
          <div className="text-center">
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--accent-text)]">
              Precios
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-slate-100 sm:text-4xl lg:text-5xl">
              Simple, transparente, <span className="text-[var(--accent)]">sin sorpresas.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-slate-300">
              Elige el plan que se adapta a tu negocio. Cancela cuando quieras.
            </p>
          </div>

          <div className="mt-16 grid items-start gap-5 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={`relative rounded-[28px] border p-8 transition-all duration-300 ${
                  plan.highlighted
                    ? "scale-[1.02] border-[var(--accent)]/40 bg-[rgba(88,196,182,0.06)] shadow-[0_24px_50px_rgba(88,196,182,0.12)]"
                    : "bg-[linear-gradient(180deg,rgba(12,23,39,0.76)_0%,rgba(8,17,28,0.62)_100%)] border-white/8"
                }`}
              >
                {plan.badge ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-contrast)]">
                      {plan.badge}
                    </span>
                  </div>
                ) : null}

                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-text)]">
                    {plan.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{plan.tagline}</p>
                </div>

                <div className="mb-6 flex items-end gap-1">
                  <span className="text-5xl font-bold tracking-tight text-slate-100">€{plan.price}</span>
                  <span className="mb-2 text-slate-400">/mes</span>
                </div>

                <p className="min-h-[84px] text-sm leading-7 text-slate-400">{plan.description}</p>

                <ul className="mb-8 mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                      <span className="text-sm text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={dashboardHref}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    plan.highlighted
                      ? "brand-button shadow-[0_18px_36px_rgba(88,196,182,0.2)]"
                      : "border border-white/8 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
                  }`}
                >
                  Empezar
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 sm:py-28 xl:px-8">
          <div className="relative overflow-hidden rounded-[32px] border border-white/8">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(88,196,182,0.16)_0%,rgba(17,28,44,0.9)_40%,rgba(11,22,37,0.94)_100%)]" />
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[var(--accent-soft)] blur-3xl" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />

            <div className="relative px-8 py-16 text-center sm:px-16 sm:py-24">
              <h2 className="mx-auto max-w-3xl text-3xl font-semibold tracking-[-0.06em] text-slate-100 sm:text-4xl lg:text-5xl">
                Empieza con tus datos. <br />
                <span className="text-[var(--accent)]">Quédate por la claridad.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">
                Hostlyx reemplaza el caos de los spreadsheets con un verdadero centro de mando financiero para tu
                negocio de alquiler vacacional.
              </p>

              <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  href={dashboardHref}
                  className="brand-button inline-flex items-center justify-center gap-2 rounded-2xl px-10 py-4 text-base font-semibold transition"
                >
                  Sube tus datos ahora
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="brand-button-secondary inline-flex items-center justify-center rounded-2xl px-10 py-4 text-base font-semibold transition"
                >
                  Ver precios
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-8 text-sm text-slate-400">
                {[
                  "Sin tarjeta de crédito",
                  "Configura en minutos",
                  "Importa desde Airbnb y Booking",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
