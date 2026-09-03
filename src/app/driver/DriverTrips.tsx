"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { formatServiceDateTime } from "@/lib/dates";

type Trip = {
  id: string;
  referenceCode: string;
  status: string;
  pickupAddress: string;
  pickupDepartment: string | null;
  pickupRoom: string | null;
  dropoffAddress: string;
  dropoffDepartment: string | null;
  dropoffRoom: string | null;
  scheduledAt: string;
  guestName: string | null;
  guestPhone: string | null;
  mobilityType: string;
  isBariatric: boolean;
  requiresOxygen: boolean;
  requiresIsolation: boolean;
  hasDnr: boolean;
  escortCount: number;
  extraAttendant: boolean;
  notes: string | null;
};

const NEXT_STATUS: Record<string, { label: string; next: string } | undefined> = {
  ASSIGNED: { label: "Start trip (en route)", next: "EN_ROUTE" },
  EN_ROUTE: { label: "Arrived at pickup", next: "ARRIVED" },
  ARRIVED: { label: "Passenger picked up", next: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Complete trip", next: "COMPLETED" },
};

export default function DriverTrips({ trips }: { trips: Trip[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function advance(tripId: string, next: string) {
    setBusyId(tripId);
    setError(null);
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data?.error ?? "The trip status could not be updated.");
        return;
      }
      router.refresh();
    } catch {
      setError("The trip status could not be updated. Check the connection and try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (trips.length === 0) {
    return <p className="text-sm text-muted-foreground">No trips assigned right now.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p>}
      {trips.map((trip) => {
        const action = NEXT_STATUS[trip.status];
        return (
          <div key={trip.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <Link href={`/trips/${trip.id}`} className="font-mono text-sm underline underline-offset-2 hover:text-primary">
                {trip.referenceCode}
              </Link>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{trip.status}</span>
            </div>
            <p className="mt-2 text-sm font-medium">{trip.guestName}</p>
            {trip.guestPhone && <p className="text-sm text-muted-foreground">{trip.guestPhone}</p>}
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="text-muted-foreground">Pickup: </span>
                {trip.pickupAddress}
                {(trip.pickupDepartment || trip.pickupRoom) && <small className="block">{[trip.pickupDepartment, trip.pickupRoom].filter(Boolean).join(" · ")}</small>}
              </p>
              <p>
                <span className="text-muted-foreground">Drop-off: </span>
                {trip.dropoffAddress}
                {(trip.dropoffDepartment || trip.dropoffRoom) && <small className="block">{[trip.dropoffDepartment, trip.dropoffRoom].filter(Boolean).join(" · ")}</small>}
              </p>
              <p>
                <span className="text-muted-foreground">Time: </span>
                {formatServiceDateTime(trip.scheduledAt)}
              </p>
              <p className="text-muted-foreground">
                {trip.mobilityType}
                {trip.isBariatric ? " · bariatric" : ""}
                {trip.requiresOxygen ? " · oxygen" : ""}
                {trip.requiresIsolation ? " · isolation precautions" : ""}
                {trip.hasDnr ? " · DNR paperwork" : ""}
                {trip.escortCount ? ` · ${trip.escortCount} escort${trip.escortCount === 1 ? "" : "s"}` : ""}
                {trip.extraAttendant ? " · extra attendant" : ""}
              </p>
              {trip.notes && <p className="italic">&ldquo;{trip.notes}&rdquo;</p>}
            </div>
            {action && (
              <button
                onClick={() => advance(trip.id, action.next)}
                disabled={busyId === trip.id}
                className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
