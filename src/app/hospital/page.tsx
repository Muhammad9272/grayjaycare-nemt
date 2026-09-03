import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import { navForRole } from "@/lib/navLinks";
import HospitalBookingForm from "./HospitalBookingForm";
import { formatServiceDateTime } from "@/lib/dates";

export default async function HospitalPortalPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "HOSPITAL") redirect("/login");

  const hospital = await prisma.hospitalAccount.findFirst({
    where: { primaryContactId: session.user.id },
    include: { trips: { orderBy: { scheduledAt: "desc" }, take: 30 } },
  });

  const name = `${session.user.firstName} ${session.user.lastName}`;
  const navLinks = navForRole(session.user.role);

  if (!hospital) {
    return (
      <DashboardShell role={session.user.role} name={name} navLinks={navLinks}>
        <h1 className="text-2xl font-semibold">Hospital portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No hospital account is linked to your login yet. Contact Gray Jay Care admin to finish setup.
        </p>
      </DashboardShell>
    );
  }

  const upcoming = hospital.trips.filter((t) =>
    ["PENDING", "QUOTED", "CONFIRMED", "ASSIGNED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(t.status),
  );

  return (
    <DashboardShell role={session.user.role} name={name} navLinks={navLinks}>
      <div>
        <h1 className="text-2xl font-semibold">{hospital.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {upcoming.length} upcoming trip{upcoming.length === 1 ? "" : "s"} · {hospital.trips.length} total
        </p>
      </div>

      <div className="mt-4">
        <HospitalBookingForm billingEmail={hospital.billingEmail} contactName={name} />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Patient trips</h2>
      <div className="mt-4 space-y-3">
        {hospital.trips.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No trips booked yet.</p>
          </div>
        ) : (
          hospital.trips.map((t) => (
            <Link
              key={t.id}
              href={`/trips/${t.id}`}
              className="block rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{t.referenceCode}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{t.status}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium">{t.guestName}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatServiceDateTime(t.scheduledAt)}
                </p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {t.pickupAddress} → {t.dropoffAddress}
              </p>
            </Link>
          ))
        )}
      </div>
    </DashboardShell>
  );
}
