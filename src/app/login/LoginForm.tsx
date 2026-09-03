"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "./actions";
import AuthShell from "@/components/AuthShell";

export default function LoginForm({ justRegistered }: { justRegistered: boolean }) {
  const [state, formAction, pending] = useActionState(loginAction, { error: null });

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your portal"
      description="Manage bookings, schedules and care journeys securely from one place."
    >
      {justRegistered && <p className="auth-success mt-5">Account created. Sign in to continue.</p>}

      <form action={formAction} className="auth-form">
        <label className="auth-label">
          Email address
          <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required className="auth-input" />
        </label>
        <label className="auth-label">
          <span className="flex items-center justify-between">
            Password
            <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:text-primary-hover">Forgot password?</Link>
          </span>
          <input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required className="auth-input" />
        </label>
        {state.error && <p className="auth-error">{state.error}</p>}
        <button type="submit" disabled={pending} className="auth-submit">
          {pending ? "Signing in..." : "Sign in securely"}
        </button>
      </form>

      <p className="auth-switch">
        New to Gray Jay Care? <Link href="/register">Create a customer account</Link>
      </p>

    </AuthShell>
  );
}
