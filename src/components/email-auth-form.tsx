"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Lock, Mail, ShieldCheck, UserRound } from "lucide-react";

type Mode = "sign-in" | "sign-up";

function inputClassName() {
  return "w-full bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400";
}

export function EmailAuthForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          if (mode === "sign-up") {
            const registerFormData = new FormData();
            registerFormData.set("fullName", fullName);
            registerFormData.set("email", email);
            registerFormData.set("password", password);

            const registerResponse = await fetch("/api/auth/register", {
              method: "POST",
              body: registerFormData,
            });
            const registerPayload = (await registerResponse.json()) as {
              error?: string;
              message?: string;
            };

            if (!registerResponse.ok) {
              setError(registerPayload.error ?? "The account could not be created.");
              return;
            }

            setMessage(registerPayload.message ?? "Account created. Signing you in now.");
          }

          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
            callbackUrl: "/onboarding",
          });

          if (!result || result.error) {
            setError("Email or password is incorrect.");
            setMessage(null);
            return;
          }

          router.push(result.url ?? "/onboarding");
          router.refresh();
        } catch {
          setError(
            mode === "sign-up"
              ? "The account could not be created."
              : "Email sign-in could not be completed.",
          );
        }
      })();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-[18px] bg-slate-950/5 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("sign-in");
            setError(null);
            setMessage(null);
          }}
          className={`rounded-[14px] px-4 py-3 text-sm font-semibold transition ${
            mode === "sign-in"
              ? "bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("sign-up");
            setError(null);
            setMessage(null);
          }}
          className={`rounded-[14px] px-4 py-3 text-sm font-semibold transition ${
            mode === "sign-up"
              ? "bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "sign-up" ? (
          <div>
            <label className="block text-center text-sm font-semibold text-slate-700">
              Full name
            </label>
            <div className="login-input-shell mt-3 flex items-center gap-3 rounded-[18px] px-4 py-4">
              <UserRound className="h-5 w-5 text-slate-400" />
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                placeholder="Your name"
                className={inputClassName()}
                required
              />
            </div>
          </div>
        ) : null}

        <div>
          <label className="block text-center text-sm font-semibold text-slate-700">
            Email
          </label>
          <div className="login-input-shell mt-3 flex items-center gap-3 rounded-[18px] px-4 py-4">
            <Mail className="h-5 w-5 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClassName()}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-center text-sm font-semibold text-slate-700">
            Password
          </label>
          <div className="login-input-shell mt-3 flex items-center gap-3 rounded-[18px] px-4 py-4">
            <Lock className="h-5 w-5 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              placeholder={mode === "sign-up" ? "At least 8 characters" : "Enter your password"}
              className={inputClassName()}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="login-submit-button flex w-full items-center justify-center gap-3 rounded-[18px] px-5 py-4 text-lg font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShieldCheck className="h-5 w-5" />
          {isPending
            ? mode === "sign-up"
              ? "Creating account..."
              : "Signing in..."
            : mode === "sign-up"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <div className="min-h-6 text-center">
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      </div>
    </div>
  );
}
