"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CancelTripButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED", note: "Cancelled by rider" }),
      });
      if (res.ok) {
        setConfirming(false);
        router.refresh();
      } else {
        const data = await res.json();
        setError(typeof data?.error === "string" ? data.error : "The trip could not be cancelled.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex flex-wrap items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">Cancel this trip? A $120 fee applies within 3 hours.</span>
        <button
          onClick={cancel}
          disabled={busy}
          className="rounded-md bg-danger-fg px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Cancelling..." : "Yes, cancel"}
        </button>
        {error && <span className="basis-full text-right text-xs text-danger-fg">{error}</span>}
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
        >
          Never mind
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => { setError(null); setConfirming(true); }}
      className="rounded-md border border-danger-fg/30 px-3 py-1.5 text-sm text-danger-fg hover:bg-danger-bg"
    >
      Cancel trip
    </button>
  );
}
