import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import { navForRole } from "@/lib/navLinks";
import CreateVehicleForm from "./CreateVehicleForm";
import VehicleStatusControl from "./VehicleStatusControl";

export default async function AdminVehiclesPage() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) redirect("/login");

  const vehicles = await prisma.vehicle.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <DashboardShell
      role={session.user.role}
      name={`${session.user.firstName} ${session.user.lastName}`}
      navLinks={navForRole(session.user.role)}
    >
      <h1 className="text-2xl font-semibold">Fleet</h1>

      <div className="mt-6 space-y-2">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-sm shadow-sm"
          >
            <Link href={`/admin/vehicles/${v.id}`} className="hover:text-primary">
              <p className="font-medium">
                {v.plateNumber} — {v.year} {v.make} {v.model}
              </p>
              <p className="text-muted-foreground">
                {v.type.replace("_", " ")} · capacity {v.capacity} · {v.odometerKm.toLocaleString()} km
              </p>
            </Link>
            <VehicleStatusControl vehicleId={v.id} status={v.status} />
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Add vehicle</h2>
      <div className="mt-4">
        <CreateVehicleForm />
      </div>
    </DashboardShell>
  );
}
