import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { navForRole } from "@/lib/navLinks";
import DriverTrips from "./DriverTrips";
import DutyToggle from "./DutyToggle";

export default async function DriverPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") redirect("/login");

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: {
      trips: {
        where: { status: { in: ["ASSIGNED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"] } },
        orderBy: { scheduledAt: "asc" },
      },
      assignedVehicle: true,
    },
  });

  if (!driver) redirect("/login");

  const name = `${session.user.firstName} ${session.user.lastName}`;

  const licenceExpired = driver.licenseExpiry <= new Date();
  if (driver.verificationStatus !== "APPROVED" || licenceExpired) {
    return (
      <DashboardShell role={session.user.role} name={name} navLinks={navForRole(session.user.role)}>
        <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warning-bg text-warning-fg">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
              <path
                d="M12 8v5m0 3.5h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className="mt-5 text-xl font-semibold">
            {licenceExpired ? "Driver licence expired" : driver.verificationStatus === "REJECTED" ? "Application not approved" : "Verification pending"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {licenceExpired
              ? "Contact administration with your renewed licence before returning to duty."
              : driver.verificationStatus === "REJECTED"
                ? "Contact administration if your licence details need to be reviewed again."
                : "Your driver account is awaiting admin verification. You’ll get access to your trip list once approved."}
          </p>
        </main>
      </DashboardShell>
    );
  }

  const trips = driver.trips.map((t) => ({
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
    guestName: t.guestName,
    guestPhone: t.guestPhone,
    mobilityType: t.mobilityType,
    isBariatric: t.isBariatric,
    requiresOxygen: t.requiresOxygen,
    requiresIsolation: t.requiresIsolation,
    hasDnr: t.hasDnr,
    escortCount: t.escortCount,
    extraAttendant: t.extraAttendant,
    notes: t.notes,
  }));

  return (
    <DashboardShell role={session.user.role} name={name} navLinks={navForRole(session.user.role)}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My trips</h1>
        <DutyToggle initialOnDuty={driver.isOnDuty} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {trips.length} assigned trip{trips.length === 1 ? "" : "s"}
      </p>
      <div className="mt-6">
        <DriverTrips trips={trips} />
      </div>
    </DashboardShell>
  );
}
