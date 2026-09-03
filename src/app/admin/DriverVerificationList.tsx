"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatServiceDate } from "@/lib/dates";

type PendingDriver = {
  id: string;
  name: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
};

export default function DriverVerificationList({ drivers }: { drivers: PendingDriver[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(id: string, status: "APPROVED" | "REJECTED") {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/drivers/${id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(typeof data?.error === "string" ? data.error : "Driver verification could not be updated.");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (drivers.length === 0) {
    return <p className="text-sm text-muted-foreground">No drivers awaiting verification.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-fg">{error}</p>}
      {drivers.map((d) => (
        <div
          key={d.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div>
            <p className="text-sm font-medium">{d.name}</p>
            <p className="text-sm text-muted-foreground">{d.email}</p>
            <p className="text-sm text-muted-foreground">
              License {d.licenseNumber} · expires {formatServiceDate(d.licenseExpiry)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={busyId === d.id}
              onClick={() => decide(d.id, "APPROVED")}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              Approve
            </button>
            <button
              disabled={busyId === d.id}
              onClick={() => decide(d.id, "REJECTED")}
              className="rounded-md border border-danger-fg/30 px-3 py-1.5 text-sm text-danger-fg hover:bg-danger-bg disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
