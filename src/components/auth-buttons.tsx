"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      type="button"
      onClick={() => void signIn("google", { callbackUrl: "/" })}
      className="rounded-2xl bg-teal-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-200"
    >
      Continue with Google
    </button>
  );
}

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/login" })}
      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
    >
      Sign out
    </button>
  );
}
