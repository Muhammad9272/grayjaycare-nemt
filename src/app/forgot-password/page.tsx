"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter your account email and we’ll send a secure one-hour reset link."
      compact
    >
      {sent ? (
        <div className="auth-success mt-7">
          If an active account exists for <strong>{email}</strong>, its secure password link is on the way.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            Email address
            <input type="email" className="auth-input" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? "Sending secure link..." : "Email me a reset link"}
          </button>
        </form>
      )}
      <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
    </AuthShell>
  );
}
