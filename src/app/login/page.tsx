import { redirect } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import { SignInButton } from "@/components/auth-buttons";
import { getAuthSession, hasGoogleAuthConfig } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getAuthSession();

  if (session?.user?.email) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="card-surface rounded-[34px] p-8 sm:p-10">
          <div className="max-w-2xl space-y-5">
            <span className="inline-flex rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-100">
              HomeXperience
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Secure hosting finance, now tied to your Google account.
            </h1>
            <p className="text-base leading-7 text-slate-300 sm:text-lg">
              Sign in once and keep your uploads, manual entries, and preferred filters
              tied to your account instead of a local file.
            </p>
          </div>
        </section>

        <section className="card-surface flex flex-col justify-between rounded-[34px] p-8">
          <div className="space-y-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-teal-400/20 bg-teal-400/10 text-teal-200">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Sign in
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Use Google to access your dashboard. If you configure `ADMIN_EMAILS`,
                only approved addresses will be able to enter.
              </p>
            </div>
            {!hasGoogleAuthConfig ? (
              <div className="rounded-[24px] border border-amber-400/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                Google login is not configured in production yet. Add
                `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Netlify, then redeploy.
              </div>
            ) : null}
            <SignInButton disabled={!hasGoogleAuthConfig} />
          </div>

          <div className="mt-8 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
            <div className="flex items-center gap-2 text-white">
              <Building2 className="h-4 w-4" />
              Ready for Netlify
            </div>
            <p className="mt-2 text-slate-400">
              Production data should use `DATABASE_URL` so uploads and entries persist
              across deploys and sessions.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
