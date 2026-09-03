"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/AuthShell";
import LongDateInput from "@/components/LongDateInput";

export default function DriverRegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/register/driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phone, password, licenseNumber, licenseExpiry }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(typeof data?.error === "string" ? data.error : "Please check the form for errors.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        eyebrow="Application submitted"
        title="We received your application"
        description="Our administration team will review your details and contact you after verification."
        compact
      >
        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success-fg">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h2 className="mt-5 text-xl font-semibold">What happens next?</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Thanks for applying to drive with Gray Jay Care. An admin will review your license details and verify
            your account. You&apos;ll be able to sign in once approved.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm font-bold text-primary underline underline-offset-4">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Join the care team"
      title="Apply to drive with us"
      description="Tell us about yourself and your licence. Approved drivers receive access to the driver portal."
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
        <div className="auth-grid">
          <label className="auth-label">
            Email address
            <input type="email" className="auth-input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="auth-label">
            Phone number
            <input type="tel" className="auth-input" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
        </div>
        <label className="auth-label">
          Create password
          <input type="password" minLength={10} className="auth-input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <span className="mt-1.5 block text-xs font-normal text-muted-foreground">Use 10+ characters with uppercase, lowercase and a number.</span>
        </label>
        <div className="auth-grid">
          <label className="auth-label">
            Driver&apos;s licence number
            <input className="auth-input" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required />
          </label>
          <label className="auth-label">
            Licence expiry
            <LongDateInput ariaLabel="Licence expiry" controlClassName="auth-input" value={licenseExpiry} onChange={setLicenseExpiry} yearsForward={15} required />
          </label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={submitting} className="auth-submit">
          {submitting ? "Submitting..." : "Submit application"}
        </button>
      </form>
      <p className="auth-switch">Already applied and approved? <Link href="/login">Sign in to the driver portal</Link>.</p>
    </AuthShell>
  );
}
