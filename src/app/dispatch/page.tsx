import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { navForRole } from "@/lib/navLinks";
import TripsBoard from "./TripsBoard";
import NewBookingForm from "./NewBookingForm";

const ACTIVE_STATUSES = [
  "PENDING",
  "QUOTED",
  "CONFIRMED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
] as const;

export default async function DispatchPage() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN", "DISPATCHER"].includes(session.user.role)) {
    redirect("/login");
  }

  const [trips, drivers, vehicles] = await Promise.all([
    prisma.trip.findMany({
      where: { status: { in: [...ACTIVE_STATUSES] } },
      orderBy: { scheduledAt: "asc" },
      include: { driver: { include: { user: true } }, vehicle: true, customer: { include: { user: true } } },
    }),
    prisma.driver.findMany({
      where: { verificationStatus: "APPROVED" },
      include: { user: true },
    }),
    prisma.vehicle.findMany({ where: { status: "ACTIVE" } }),
  ]);

  const serialized = trips.map((t) => ({
    id: t.id,
    referenceCode: t.referenceCode,
    status: t.status,
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
  }));

  const driverOptions = drivers.map((d) => ({
    id: d.id,
    name: `${d.user.firstName} ${d.user.lastName}`,
    onDuty: d.isOnDuty,
  }));

  const vehicleOptions = vehicles.map((v) => ({ id: v.id, label: `${v.plateNumber} — ${v.make} ${v.model}`, type: v.type }));

  return (
    <DashboardShell
      role={session.user.role}
      name={`${session.user.firstName} ${session.user.lastName}`}
      navLinks={navForRole(session.user.role)}
    >
      <div>
        <h1 className="text-2xl font-semibold">Dispatcher board</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {trips.length} active trip{trips.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4">
        <NewBookingForm />
      </div>

      <div className="mt-6">
        <TripsBoard trips={serialized} drivers={driverOptions} vehicles={vehicleOptions} />
      </div>
    </DashboardShell>
  );
}
