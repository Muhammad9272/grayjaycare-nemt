"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthShell from "@/components/AuthShell";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phone, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(typeof data?.error === "string" ? data.error : "Please check the form for errors.");
        return;
      }
      router.push("/login?registered=1");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Customer account"
      title="Create your care portal"
      description="Save your details, track upcoming trips and make future bookings faster."
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-grid">
          <label className="auth-label">
            First name
            <input className="auth-input" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </label>
          <label className="auth-label">
            Last name
            <input className="auth-input" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </label>
        </div>
        <label className="auth-label">
          Email address
          <input type="email" className="auth-input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="auth-label">
          Phone number
          <input type="tel" className="auth-input" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label className="auth-label">
          Password
          <input
            type="password"
            minLength={10}
            className="auth-input"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span className="mt-1.5 block text-xs font-normal text-muted-foreground">Use 10+ characters with uppercase, lowercase and a number.</span>
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={submitting} className="auth-submit">
          {submitting ? "Creating account..." : "Create my account"}
        </button>
      </form>

      <p className="auth-switch">
        Already registered? <Link href="/login">Sign in</Link>. Want to join our care team?{" "}
        <Link href="/register/driver">Apply to drive</Link>.
      </p>
    </AuthShell>
  );
}
