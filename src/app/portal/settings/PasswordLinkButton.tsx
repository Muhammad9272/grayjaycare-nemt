"use client";

import { useState } from "react";

export default function PasswordLinkButton({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        setError("The secure link could not be sent. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("The secure link could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) return <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Secure password link sent. Please check your inbox.</p>;
  return <div><button type="button" onClick={sendLink} disabled={busy} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover disabled:opacity-60">{busy ? "Sending..." : "Email me a password link"}</button>{error && <p className="mt-2 text-sm text-danger-fg">{error}</p>}</div>;
}
