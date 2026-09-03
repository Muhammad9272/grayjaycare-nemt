import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { navForRole } from "@/lib/navLinks";
import VehicleLogForms from "./VehicleLogForms";
import { formatServiceDate } from "@/lib/dates";

export default async function DriverVehiclePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") redirect("/login");

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: { assignedVehicle: true },
  });
  if (!driver) redirect("/login");
  if (driver.verificationStatus !== "APPROVED" || driver.licenseExpiry <= new Date()) redirect("/driver");

  const navLinks = navForRole(session.user.role);
  const name = `${session.user.firstName} ${session.user.lastName}`;

  if (!driver.assignedVehicle) {
    return (
      <DashboardShell role={session.user.role} name={name} navLinks={navLinks}>
        <h1 className="text-2xl font-semibold">Vehicle & logs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No vehicle is assigned to your account yet. Contact your dispatcher.
        </p>
      </DashboardShell>
    );
  }

  const vehicle = driver.assignedVehicle;

  const [inspections, mileageLogs, fuelLogs] = await Promise.all([
    prisma.vehicleInspection.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: { performedAt: "desc" },
      take: 10,
    }),
    prisma.mileageLog.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: { recordedAt: "desc" },
      take: 10,
    }),
    prisma.fuelLog.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: { recordedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <DashboardShell role={session.user.role} name={name} navLinks={navLinks}>
      <h1 className="text-2xl font-semibold">Vehicle & logs</h1>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-lg font-semibold">
          {vehicle.plateNumber} — {vehicle.year} {vehicle.make} {vehicle.model}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {vehicle.type.replace("_", " ")} · capacity {vehicle.capacity} · odometer {vehicle.odometerKm.toLocaleString()} km ·{" "}
          status {vehicle.status}
        </p>
      </div>

      <div className="mt-6">
        <VehicleLogForms currentOdometer={vehicle.odometerKm} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <LogList title="Inspections">
          {inspections.length === 0 && <Empty />}
          {inspections.map((i) => (
            <div key={i.id} className="rounded-lg border border-border bg-card p-3 text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <span className={i.passed ? "font-medium text-success-fg" : "font-medium text-danger-fg"}>
                  {i.passed ? "Passed" : "Failed"}
                </span>
                <span className="text-xs text-muted-foreground">{formatServiceDate(i.performedAt)}</span>
              </div>
              <p className="text-muted-foreground">{i.odometerKm.toLocaleString()} km</p>
              {i.notes && <p className="mt-1 italic text-muted-foreground">&ldquo;{i.notes}&rdquo;</p>}
            </div>
          ))}
        </LogList>

        <LogList title="Mileage">
          {mileageLogs.length === 0 && <Empty />}
          {mileageLogs.map((m) => (
            <div key={m.id} className="rounded-lg border border-border bg-card p-3 text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{(m.endKm - m.startKm).toLocaleString()} km</span>
                <span className="text-xs text-muted-foreground">{formatServiceDate(m.recordedAt)}</span>
              </div>
              <p className="text-muted-foreground">
                {m.startKm.toLocaleString()} → {m.endKm.toLocaleString()} km
              </p>
            </div>
          ))}
        </LogList>

        <LogList title="Fuel">
          {fuelLogs.length === 0 && <Empty />}
          {fuelLogs.map((f) => (
            <div key={f.id} className="rounded-lg border border-border bg-card p-3 text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">${Number(f.cost).toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">{formatServiceDate(f.recordedAt)}</span>
              </div>
              <p className="text-muted-foreground">
                {Number(f.litres).toFixed(1)} L at {f.odometerKm.toLocaleString()} km
              </p>
            </div>
          ))}
        </LogList>
      </div>
    </DashboardShell>
  );
}

function LogList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">No entries yet.</p>;
}
