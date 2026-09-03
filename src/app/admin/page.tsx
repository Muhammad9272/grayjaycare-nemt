import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import { navForRole } from "@/lib/navLinks";
import DriverVerificationList from "./DriverVerificationList";
import { formatServiceDateTime } from "@/lib/dates";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) redirect("/login");

  const [pendingDrivers, counts, recentTrips, recentActivity] = await Promise.all([
    prisma.driver.findMany({
      where: { verificationStatus: "PENDING" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.$transaction([
      prisma.user.count(),
      prisma.driver.count({ where: { verificationStatus: "APPROVED" } }),
      prisma.vehicle.count(),
      prisma.trip.count({ where: { status: { in: ["PENDING", "QUOTED", "CONFIRMED"] } } }),
    ]),
    prisma.trip.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { customer: { include: { user: true } } },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: true },
    }),
  ]);

  const [userCount, activeDriverCount, vehicleCount, pendingTripCount] = counts;

  const pending = pendingDrivers.map((d) => ({
    id: d.id,
    name: `${d.user.firstName} ${d.user.lastName}`,
    email: d.user.email,
    licenseNumber: d.licenseNumber,
    licenseExpiry: d.licenseExpiry.toISOString(),
  }));

  return (
    <DashboardShell
      role={session.user.role}
      name={`${session.user.firstName} ${session.user.lastName}`}
      navLinks={navForRole(session.user.role)}
    >
      <h1 className="text-2xl font-semibold">Admin overview</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Users" value={userCount} />
        <Stat label="Active drivers" value={activeDriverCount} />
        <Stat label="Vehicles" value={vehicleCount} />
        <Stat label="Pending bookings" value={pendingTripCount} />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Driver verification queue</h2>
      <div className="mt-4">
        <DriverVerificationList drivers={pending} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent bookings</h2>
            <Link href="/admin/trips" className="text-sm font-medium text-primary underline underline-offset-2">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {recentTrips.length === 0 && <p className="text-sm text-muted-foreground">No trips yet.</p>}
            {recentTrips.map((t) => (
              <Link
                key={t.id}
                href={`/trips/${t.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-sm shadow-sm hover:border-primary"
              >
                <div>
                  <span className="font-mono">{t.referenceCode}</span>
                  <span className="ml-2 text-muted-foreground">
                    {t.guestName ?? (t.customer ? `${t.customer.user.firstName} ${t.customer.user.lastName}` : "—")}
                  </span>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{t.status}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <div className="mt-4 space-y-2">
            {recentActivity.length === 0 && <p className="text-sm text-muted-foreground">No activity logged yet.</p>}
            {recentActivity.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm shadow-sm">
                <p>
                  <span className="font-medium">{a.user ? `${a.user.firstName} ${a.user.lastName}` : "System"}</span>{" "}
                  <span className="text-muted-foreground">{a.action.replace(/\./g, " ")}</span>
                </p>
                <p className="text-xs text-muted-foreground">{formatServiceDateTime(a.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
