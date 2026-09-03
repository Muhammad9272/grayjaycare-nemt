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
  mobilityType: string;
  estimatedFare: number | null;
  guestName: string;
  guestPhone: string | null;
  contactName: string | null;
  contactPhoneExtension: string | null;
  medicalRecordNumber: string | null;
  escortCount: number;
  requiresIsolation: boolean;
  hasDnr: boolean;
  requiresOxygen: boolean;
  driverId: string | null;
  driverName: string | null;
  vehicleId: string | null;
  vehiclePlate: string | null;
};

type Driver = { id: string; name: string; onDuty: boolean };
type Vehicle = { id: string; label: string; type: string };

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  QUOTED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  ASSIGNED: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  EN_ROUTE: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  ARRIVED: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  IN_PROGRESS: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

export default function TripsBoard({ trips, drivers, vehicles }: { trips: Trip[]; drivers: Driver[]; vehicles: Vehicle[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateTrip(tripId: string, payload: Record<string, unknown>) {
    setBusyId(tripId);
    setError(null);
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data?.error ?? "The trip could not be updated.");
        return;
      }
      router.refresh();
    } catch {
      setError("The trip could not be updated. Check the connection and try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function assign(tripId: string, driverId: string, vehicleId: string) {
    await updateTrip(tripId, { driverId: driverId || null, vehicleId: vehicleId || null });
  }

  function compatibleVehicles(mobilityType: string) {
    return vehicles.filter((vehicle) => {
      if (mobilityType === "STRETCHER") return vehicle.type === "STRETCHER_VAN";
      if (mobilityType === "WHEELCHAIR") return ["WHEELCHAIR_VAN", "STRETCHER_VAN"].includes(vehicle.type);
      return true;
    });
  }

  async function cancel(tripId: string) {
    await updateTrip(tripId, { status: "CANCELLED", note: "Cancelled by dispatcher" });
  }

  if (trips.length === 0) {
    return <p className="text-sm text-muted-foreground">No active trips right now.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p>}
      {trips.map((trip) => (
        <div key={trip.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Link href={`/trips/${trip.id}`} className="font-mono text-sm underline underline-offset-2 hover:text-primary">
                  {trip.referenceCode}
                </Link>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[trip.status] ?? "bg-muted"}`}>
                  {trip.status}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium">{trip.guestName}</p>
              {trip.medicalRecordNumber && <p className="text-xs text-muted-foreground">MRN: {trip.medicalRecordNumber}</p>}
              {trip.guestPhone && <p className="text-sm text-muted-foreground">{trip.guestPhone}{trip.contactPhoneExtension ? ` ext. ${trip.contactPhoneExtension}` : ""}</p>}
              {trip.contactName && <p className="text-xs text-muted-foreground">Contact: {trip.contactName}</p>}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{formatServiceDateTime(trip.scheduledAt)}</p>
              {trip.estimatedFare != null && <p>${trip.estimatedFare.toFixed(2)}</p>}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground/70">Pickup: </span>
              {trip.pickupAddress}
              {(trip.pickupDepartment || trip.pickupRoom) && <small className="block">{[trip.pickupDepartment, trip.pickupRoom].filter(Boolean).join(" · ")}</small>}
            </p>
            <p>
              <span className="text-muted-foreground/70">Drop-off: </span>
              {trip.dropoffAddress}
              {(trip.dropoffDepartment || trip.dropoffRoom) && <small className="block">{[trip.dropoffDepartment, trip.dropoffRoom].filter(Boolean).join(" · ")}</small>}
            </p>
          </div>

          {(trip.requiresIsolation || trip.hasDnr || trip.requiresOxygen || trip.escortCount > 0) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
              {trip.requiresIsolation && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">Isolation</span>}
              {trip.hasDnr && <span className="rounded-full bg-red-100 px-2 py-1 text-red-800">DNR paperwork</span>}
              {trip.requiresOxygen && <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">Oxygen</span>}
              {trip.escortCount > 0 && <span className="rounded-full bg-muted px-2 py-1">{trip.escortCount} escort{trip.escortCount === 1 ? "" : "s"}</span>}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              defaultValue={trip.driverId ?? ""}
              disabled={busyId === trip.id}
              onChange={(e) => assign(trip.id, e.target.value, trip.vehicleId ?? "")}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Assign driver...</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.onDuty ? "(on duty)" : ""}
                </option>
              ))}
            </select>
            <select
              defaultValue={trip.vehicleId ?? ""}
              disabled={busyId === trip.id}
              onChange={(e) => assign(trip.id, trip.driverId ?? "", e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Assign vehicle...</option>
              {compatibleVehicles(trip.mobilityType).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <button
              disabled={busyId === trip.id}
              onClick={() => cancel(trip.id)}
              className="ml-auto rounded-md border border-danger-fg/30 px-3 py-1.5 text-sm text-danger-fg hover:bg-danger-bg disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
