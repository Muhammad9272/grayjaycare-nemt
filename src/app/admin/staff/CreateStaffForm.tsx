"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15";
const labelClass = "text-sm font-medium text-foreground";

type Role = "ADMIN" | "DISPATCHER" | "ACCOUNTANT" | "HOSPITAL";

export default function CreateStaffForm({ canCreateAdmin }: { canCreateAdmin: boolean }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("DISPATCHER");
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalBillingEmail, setHospitalBillingEmail] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          role,
          hospitalName: role === "HOSPITAL" ? hospitalName : undefined,
          hospitalBillingEmail: role === "HOSPITAL" && hospitalBillingEmail ? hospitalBillingEmail : undefined,
          hospitalAddress: role === "HOSPITAL" && hospitalAddress ? hospitalAddress : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(typeof data?.error === "string" ? data.error : "Please check the form for errors.");
        return;
      }
      const data = await res.json();
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setHospitalName("");
      setHospitalBillingEmail("");
      setHospitalAddress("");
      setSuccess(data.emailSent ? "Account created. A secure password-setup link was emailed." : "Account created, but email delivery is unavailable. Use password reset after email is configured.");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 ">
      <div>
        <label className={labelClass}>First name</label>
        <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
      </div>
      <div>
        <label className={labelClass}>Last name</label>
        <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className={labelClass}>Phone (optional)</label>
        <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Role</label>
        <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="DISPATCHER">Dispatcher</option>
          {canCreateAdmin && <option value="ADMIN">Admin</option>}
          <option value="ACCOUNTANT">Accountant</option>
          <option value="HOSPITAL">Hospital contact</option>
        </select>
      </div>
      {role === "HOSPITAL" && (
        <>
          <div className="sm:col-span-2">
            <label className={labelClass}>Hospital name</label>
            <input className={inputClass} value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Billing email (optional)</label>
            <input type="email" className={inputClass} value={hospitalBillingEmail} onChange={(e) => setHospitalBillingEmail(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Hospital address (optional)</label>
            <input className={inputClass} value={hospitalAddress} onChange={(e) => setHospitalAddress(e.target.value)} />
          </div>
        </>
      )}
      {error && (
        <p className="sm:col-span-2 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger-fg">{error}</p>
      )}
      {success && <p className="sm:col-span-2 rounded-md bg-success-bg px-3 py-2 text-sm text-success-fg">{success}</p>}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create account"}
        </button>
      </div>
    </form>
  );
}
