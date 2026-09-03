"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type VehicleStatus = "ACTIVE" | "MAINTENANCE" | "OUT_OF_SERVICE";

const STATUS_COLORS: Record<VehicleStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  MAINTENANCE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  OUT_OF_SERVICE: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export default function VehicleStatusControl({ vehicleId, status }: { vehicleId: string; status: VehicleStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(next: VehicleStatus) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(typeof data?.error === "string" ? data.error : "Vehicle status could not be updated.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span>
      <select
        value={status}
        disabled={busy}
        onChange={(e) => update(e.target.value as VehicleStatus)}
        className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${STATUS_COLORS[status]}`}
      >
        <option value="ACTIVE">Active</option>
        <option value="MAINTENANCE">Maintenance</option>
        <option value="OUT_OF_SERVICE">Out of service</option>
      </select>
      {error && <small className="mt-1 block max-w-60 text-xs text-danger-fg">{error}</small>}
    </span>
  );
}
