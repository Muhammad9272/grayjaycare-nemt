"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";

export default function ResetPasswordForm({ token, newAccount }: { token: string; newAccount: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(token ? null : "This password link is incomplete.");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "This password link could not be used.");
        return;
      }

      const result = await signIn("credentials", { email: data.email, password, redirect: false });
      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please request a new password link.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow={newAccount ? "Finish account setup" : "Secure password reset"}
      title={newAccount ? "Create your portal password" : "Choose a new password"}
      description={newAccount ? "Your booking is already in the portal. Create a password for future visits." : "Your new password will take effect immediately."}
      compact
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <label className="auth-label">
          New password
          <input type="password" minLength={10} className="auth-input" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <label className="auth-label">
          Confirm new password
          <input type="password" minLength={10} className="auth-input" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" className="auth-submit" disabled={submitting || !token}>
          {submitting ? "Securing your account..." : "Save password and continue"}
        </button>
      </form>
      <p className="auth-switch"><Link href="/forgot-password">Request a new link</Link></p>
    </AuthShell>
  );
}
