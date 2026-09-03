import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import { navForRole } from "@/lib/navLinks";
import { formatServiceDate } from "@/lib/dates";

export default async function DriverHistoryPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") redirect("/login");

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) redirect("/login");
  if (driver.verificationStatus !== "APPROVED" || driver.licenseExpiry <= new Date()) redirect("/driver");

  const trips = await prisma.trip.findMany({
    where: { driverId: driver.id, status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <DashboardShell
      role={session.user.role}
      name={`${session.user.firstName} ${session.user.lastName}`}
      navLinks={navForRole(session.user.role)}
    >
      <h1 className="text-2xl font-semibold">Trip history</h1>
      <p className="mt-1 text-sm text-muted-foreground">{trips.length} past trip{trips.length === 1 ? "" : "s"}</p>

      <div className="mt-6 space-y-2">
        {trips.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No completed or cancelled trips yet.
          </p>
        )}
        {trips.map((t) => (
          <Link
            key={t.id}
            href={`/trips/${t.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-sm shadow-sm hover:border-primary"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono">{t.referenceCode}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{t.status}</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {t.pickupAddress} → {t.dropoffAddress}
              </p>
            </div>
            <p className="text-muted-foreground">{formatServiceDate(t.updatedAt)}</p>
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}
