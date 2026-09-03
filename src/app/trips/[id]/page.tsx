import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { navForRole } from "@/lib/navLinks";
import { CheckCircleIcon, ClockIcon } from "@/components/icons";
import CancelTripButton from "@/components/CancelTripButton";
import type { TripStatus } from "@/generated/prisma/client";
import { formatServiceDateTime } from "@/lib/dates";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Submitted",
  QUOTED: "Quoted",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Driver assigned",
  EN_ROUTE: "Driver en route",
  ARRIVED: "Driver arrived",
  IN_PROGRESS: "Trip in progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

const RIDER_CANCELLABLE_STATUSES: TripStatus[] = ["PENDING", "QUOTED", "CONFIRMED", "ASSIGNED", "EN_ROUTE"];

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      customer: { include: { user: true } },
      driver: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
      vehicle: true,
      hospital: true,
      bookedBy: { select: { firstName: true, lastName: true, role: true } },
      dispatchedBy: { select: { firstName: true, lastName: true } },
      statusEvents: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!trip) notFound();

  const role = session.user.role;
  const isStaff = ["SUPER_ADMIN", "ADMIN", "DISPATCHER", "ACCOUNTANT"].includes(role);
  let authorized = isStaff;
  if (!authorized && role === "DRIVER") {
    const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
    authorized = !!driver && trip.driverId === driver.id;
  }
  if (!authorized && role === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
    authorized = !!customer && trip.customerId === customer.id;
  }
  if (!authorized && role === "HOSPITAL") {
    const hospital = await prisma.hospitalAccount.findFirst({ where: { primaryContactId: session.user.id } });
    authorized = !!hospital && trip.hospitalId === hospital.id;
  }
  if (!authorized) redirect("/dashboard");

  const riderName =
    trip.guestName ?? (trip.customer ? `${trip.customer.user.firstName} ${trip.customer.user.lastName}` : "—");
  const riderPhone = trip.guestPhone ?? trip.customer?.user.phone ?? null;
  const canCancel = RIDER_CANCELLABLE_STATUSES.includes(trip.status) && (role === "CUSTOMER" || role === "HOSPITAL");

  return (
    <DashboardShell role={role} name={`${session.user.firstName} ${session.user.lastName}`} navLinks={navForRole(role)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{trip.referenceCode}</p>
          <h1 className="mt-1 text-2xl font-semibold">
            {trip.pickupAddress.split(",")[0]} → {trip.dropoffAddress.split(",")[0]}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">{STATUS_LABELS[trip.status] ?? trip.status}</span>
          {canCancel && <CancelTripButton tripId={trip.id} />}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Trip details</h2>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Field label="Pickup" value={trip.pickupAddress} />
              <Field label="Drop-off" value={trip.dropoffAddress} />
              {(trip.pickupDepartment || trip.pickupRoom) && (
                <Field label="Pickup unit" value={[trip.pickupDepartment, trip.pickupRoom].filter(Boolean).join(" · ")} />
              )}
              {(trip.dropoffDepartment || trip.dropoffRoom) && (
                <Field label="Drop-off unit" value={[trip.dropoffDepartment, trip.dropoffRoom].filter(Boolean).join(" · ")} />
              )}
              <Field label="Scheduled" value={formatServiceDateTime(trip.scheduledAt)} />
              <Field label="Timing preference" value={humanize(trip.pickupTimePreference)} />
              <Field label="Trip type" value={humanize(trip.returnTripType)} />
              <Field label="Distance" value={trip.distanceKm ? `${trip.distanceKm} km` : "—"} />
              <Field label="Mobility" value={trip.mobilityType} />
              <Field label="Trip location" value={trip.isOutOfCity ? "Outside London, ON" : "Within London, ON"} />
              <Field label="Wait time" value={`${trip.estimatedWaitMinutes} min`} />
              <Field label="Bariatric" value={trip.isBariatric ? "Yes" : "No"} />
              <Field label="Oxygen" value={trip.requiresOxygen ? "Yes" : "No"} />
              <Field label="Isolation precautions" value={trip.requiresIsolation ? "Yes" : "No"} />
              <Field label="DNR paperwork" value={trip.hasDnr ? "Available" : "Not indicated"} />
              <Field label="Patient escorts" value={String(trip.escortCount)} />
              <Field label="Payment preference" value={trip.paymentPreference ? humanize(trip.paymentPreference) : "Not specified"} />
              <Field label="Medical documents" value={trip.medicalDocumentsAvailable ? "Available — arrange secure collection" : "Not indicated"} />
              <Field
                label="Extra attendant"
                value={trip.extraAttendant ? `Yes (${trip.extraAttendantHours ?? 0} hr)` : "No"}
              />
              {trip.passengerWeightKg && <Field label="Passenger weight" value={`${trip.passengerWeightKg} kg`} />}
              <Field label="Source" value={trip.source.replace("_", " ")} />
            </dl>
            {trip.notes && (
              <p className="mt-3 rounded-md bg-muted p-3 text-sm italic">&ldquo;{trip.notes}&rdquo;</p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Status timeline</h2>
            <ol className="mt-4 space-y-4">
              {trip.statusEvents.map((e, idx) => (
                <li key={e.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${
                        idx === trip.statusEvents.length - 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {idx === trip.statusEvents.length - 1 ? (
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                      ) : (
                        <ClockIcon className="h-3.5 w-3.5" />
                      )}
                    </span>
                    {idx < trip.statusEvents.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-border" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium">{STATUS_LABELS[e.status] ?? e.status}</p>
                    <p className="text-xs text-muted-foreground">{formatServiceDateTime(e.createdAt)}</p>
                    {e.note && <p className="mt-1 text-sm text-muted-foreground">{e.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Rider</h2>
            <p className="mt-2 text-sm font-medium">{riderName}</p>
            {riderPhone && <p className="text-sm text-muted-foreground">{riderPhone}</p>}
            {trip.medicalRecordNumber && <p className="mt-1 text-sm text-muted-foreground">MRN: {trip.medicalRecordNumber}</p>}
            {trip.contactName && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Booking contact</p>
                <p className="mt-1 text-sm font-medium">{trip.contactName}</p>
                <p className="text-sm text-muted-foreground">
                  {trip.guestPhone}{trip.contactPhoneExtension ? ` ext. ${trip.contactPhoneExtension}` : ""}
                </p>
                {trip.guestEmail && <p className="text-sm text-muted-foreground">{trip.guestEmail}</p>}
              </div>
            )}
            {trip.hospital && <p className="mt-1 text-sm text-muted-foreground">via {trip.hospital.name}</p>}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Driver & vehicle</h2>
            {trip.driver ? (
              <>
                <p className="mt-2 text-sm font-medium">
                  {trip.driver.user.firstName} {trip.driver.user.lastName}
                </p>
                {trip.driver.user.phone && <p className="text-sm text-muted-foreground">{trip.driver.user.phone}</p>}
                {trip.vehicle && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {trip.vehicle.plateNumber} — {trip.vehicle.make} {trip.vehicle.model}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Not yet assigned</p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Fare</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <Field label="Estimated" value={trip.estimatedFare ? `$${Number(trip.estimatedFare).toFixed(2)}` : "—"} />
              {trip.finalFare && <Field label="Final" value={`$${Number(trip.finalFare).toFixed(2)}`} />}
            </dl>
          </section>

          {(trip.bookedBy || trip.dispatchedBy) && (
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm text-sm text-muted-foreground">
              {trip.bookedBy && (
                <p>
                  Booked by {trip.bookedBy.firstName} {trip.bookedBy.lastName}
                </p>
              )}
              {trip.dispatchedBy && (
                <p>
                  Dispatched by {trip.dispatchedBy.firstName} {trip.dispatchedBy.lastName}
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

function humanize(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
