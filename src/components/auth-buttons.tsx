"use client";

import { signIn, signOut } from "next-auth/react";

type SignInButtonProps = {
  disabled?: boolean;
};

export function SignInButton({ disabled = false }: SignInButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) {
          return;
        }

        void signIn("google", { callbackUrl: "/dashboard" });
      }}
      disabled={disabled}
      className="brand-button rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
    >
      {disabled ? "Google login not configured" : "Continue with Google"}
    </button>
  );
}

export function SignOutButton({
  className,
}: {
  className?: string;
} = {}) {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/" })}
      className={className ?? "brand-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"}
    >
      Sign out
    </button>
  );
}
