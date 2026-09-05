import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { navForRole } from "@/lib/navLinks";
import TripsBoard from "./TripsBoard";
import Link from "next/link";

const ACTIVE_STATUSES = [
  "PENDING",
  "QUOTED",
  "CONFIRMED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
] as const;

export default async function DispatchPage({ searchParams }: { searchParams: Promise<{ booked?: string }> }) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN", "DISPATCHER"].includes(session.user.role)) {
    redirect("/login");
  }

  const [trips, drivers, vehicles, query] = await Promise.all([
    prisma.trip.findMany({
      where: { status: { in: [...ACTIVE_STATUSES] } },
      orderBy: { scheduledAt: "asc" },
      include: {
        driver: { include: { user: true } },
        vehicle: true,
        customer: { include: { user: true } },
        dispatchedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.driver.findMany({
      where: {
        verificationStatus: "APPROVED",
        licenseExpiry: { gt: new Date() },
        user: { isActive: true },
      },
      include: { user: true },
    }),
    prisma.vehicle.findMany({ where: { status: "ACTIVE" } }),
    searchParams,
  ]);

  const serialized = trips.map((t) => ({
    id: t.id,
    referenceCode: t.referenceCode,
    status: t.status,
    source: t.source,
    pickupAddress: t.pickupAddress,
    pickupDepartment: t.pickupDepartment,
    pickupRoom: t.pickupRoom,
    dropoffAddress: t.dropoffAddress,
    dropoffDepartment: t.dropoffDepartment,
    dropoffRoom: t.dropoffRoom,
    scheduledAt: t.scheduledAt.toISOString(),
    mobilityType: t.mobilityType,
    estimatedFare: t.estimatedFare ? Number(t.estimatedFare) : null,
    guestName: t.guestName ?? t.customer?.user.firstName + " " + t.customer?.user.lastName,
    guestPhone: t.guestPhone,
    contactName: t.contactName,
    contactPhoneExtension: t.contactPhoneExtension,
    medicalRecordNumber: t.medicalRecordNumber,
    escortCount: t.escortCount,
    requiresIsolation: t.requiresIsolation,
    hasDnr: t.hasDnr,
    requiresOxygen: t.requiresOxygen,
    driverId: t.driverId,
    driverName: t.driver ? `${t.driver.user.firstName} ${t.driver.user.lastName}` : null,
    vehicleId: t.vehicleId,
    vehiclePlate: t.vehicle?.plateNumber ?? null,
    dispatchedByName: t.dispatchedBy ? `${t.dispatchedBy.firstName} ${t.dispatchedBy.lastName}` : null,
  }));

  const driverOptions = drivers
    .map((d) => ({
      id: d.id,
      name: `${d.user.firstName} ${d.user.lastName}`,
      onDuty: d.isOnDuty,
    }))
    .sort((a, b) => Number(b.onDuty) - Number(a.onDuty) || a.name.localeCompare(b.name));

  const vehicleOptions = vehicles.map((v) => ({ id: v.id, label: `${v.plateNumber} — ${v.make} ${v.model}`, type: v.type }));

  return (
    <DashboardShell
      role={session.user.role}
      name={`${session.user.firstName} ${session.user.lastName}`}
      navLinks={navForRole(session.user.role)}
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Dispatcher board</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {trips.length} active trip{trips.length === 1 ? "" : "s"} from every booking channel
            </p>
          </div>
          <Link
            href="/book?source=phone"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
          >
            + New phone booking
          </Link>
        </div>
      </div>

      {query.booked && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          Phone booking created successfully. It is now in the shared dispatch queue below.
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">1 · Incoming</p>
          <p className="mt-2 text-sm text-muted-foreground">Website, phone, and hospital requests enter this one time-ordered queue.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">2 · Assign safely</p>
          <p className="mt-2 text-sm text-muted-foreground">Choose an approved driver and a compatible active vehicle, then assign both together.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">3 · Track progress</p>
          <p className="mt-2 text-sm text-muted-foreground">The assigned driver updates en route, arrival, pickup, and completion from their portal.</p>
        </div>
      </div>

      <div className="mt-6">
        <TripsBoard trips={serialized} drivers={driverOptions} vehicles={vehicleOptions} />
      </div>
    </DashboardShell>
  );
}
