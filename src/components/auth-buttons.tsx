"use client";

import type { ReactNode } from "react";
import { signIn, signOut } from "next-auth/react";

type SignInButtonProps = {
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
  label?: string;
};

export function SignInButton({
  disabled = false,
  className,
  icon,
  label,
}: SignInButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) {
          return;
        }

        void signIn("google", { callbackUrl: "/onboarding" });
      }}
      disabled={disabled}
      className={
        className ??
        "brand-button rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
      }
    >
      {icon}
      {disabled ? "Google login not configured" : label ?? "Continue with Google"}
    </button>
  );
}

export function SignOutButton({
  className,
  label = "Sign out",
  icon,
  ariaLabel,
}: {
  className?: string;
  label?: string;
  icon?: ReactNode;
  ariaLabel?: string;
} = {}) {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/" })}
      aria-label={ariaLabel ?? label}
      className={className ?? "brand-button-secondary rounded-2xl px-4 py-3 text-sm font-semibold transition"}
    >
      {icon}
      {label ? <span>{label}</span> : null}
    </button>
  );
}
