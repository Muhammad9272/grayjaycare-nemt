import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatServiceDate } from "@/lib/dates";
import DashboardShell from "@/components/DashboardShell";
import { navForRole } from "@/lib/navLinks";
import VehicleStatusControl from "../VehicleStatusControl";

export default async function AdminVehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) redirect("/login");

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      drivers: { include: { user: true } },
      inspections: { orderBy: { performedAt: "desc" }, take: 15, include: { driver: { include: { user: true } } } },
      mileageLogs: { orderBy: { recordedAt: "desc" }, take: 15 },
      fuelLogs: { orderBy: { recordedAt: "desc" }, take: 15 },
      maintenance: { orderBy: { performedAt: "desc" }, take: 15 },
    },
  });

  if (!vehicle) notFound();

  return (
    <DashboardShell
      role={session.user.role}
      name={`${session.user.firstName} ${session.user.lastName}`}
      navLinks={navForRole(session.user.role)}
    >
      <Link href="/admin/vehicles" className="text-sm text-muted-foreground underline underline-offset-2">
        ← Fleet
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {vehicle.plateNumber} — {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {vehicle.type.replace("_", " ")} · capacity {vehicle.capacity} · odometer {vehicle.odometerKm.toLocaleString()} km
          </p>
        </div>
        <VehicleStatusControl vehicleId={vehicle.id} status={vehicle.status} />
      </div>

      {vehicle.drivers.length > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Assigned to: {vehicle.drivers.map((d) => `${d.user.firstName} ${d.user.lastName}`).join(", ")}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <LogList title="Inspections">
          {vehicle.inspections.length === 0 && <Empty />}
          {vehicle.inspections.map((i) => (
            <div key={i.id} className="rounded-lg border border-border bg-card p-3 text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <span className={i.passed ? "font-medium text-success-fg" : "font-medium text-danger-fg"}>
                  {i.passed ? "Passed" : "Failed"}
                </span>
                <span className="text-xs text-muted-foreground">{formatServiceDate(i.performedAt)}</span>
              </div>
              <p className="text-muted-foreground">
                {i.driver.user.firstName} {i.driver.user.lastName} · {i.odometerKm.toLocaleString()} km
              </p>
              {i.notes && <p className="mt-1 italic text-muted-foreground">&ldquo;{i.notes}&rdquo;</p>}
            </div>
          ))}
        </LogList>

        <LogList title="Mileage">
          {vehicle.mileageLogs.length === 0 && <Empty />}
          {vehicle.mileageLogs.map((m) => (
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
          {vehicle.fuelLogs.length === 0 && <Empty />}
          {vehicle.fuelLogs.map((f) => (
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
