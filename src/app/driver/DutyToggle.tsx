"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DutyToggle({ initialOnDuty }: { initialOnDuty: boolean }) {
  const [onDuty, setOnDuty] = useState(initialOnDuty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const next = !onDuty;
      const response = await fetch("/api/drivers/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnDuty: next }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(typeof data?.error === "string" ? data.error : "Duty status could not be updated.");
        return;
      }
      setOnDuty(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button
        onClick={toggle}
        disabled={busy}
        className={`rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-50 ${
          onDuty ? "bg-success-bg text-success-fg" : "bg-muted text-muted-foreground"
        }`}
      >
        {busy ? "Updating..." : onDuty ? "On duty" : "Off duty"}
      </button>
      {error && <p className="mt-1 max-w-64 text-xs text-danger-fg">{error}</p>}
    </div>
  );
}
