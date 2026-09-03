import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import { navForRole } from "@/lib/navLinks";
import CancelTripButton from "@/components/CancelTripButton";
import type { TripStatus } from "@/generated/prisma/client";
import PortalRefresh from "./PortalRefresh";
import { formatServiceDateTime } from "@/lib/dates";

const CANCELLABLE: TripStatus[] = ["PENDING", "QUOTED", "CONFIRMED", "ASSIGNED", "EN_ROUTE"];

const STATUS_LABELS: Record<TripStatus, string> = {
  PENDING: "Request submitted",
  QUOTED: "Fare reviewed",
  CONFIRMED: "Booking confirmed",
  ASSIGNED: "Driver assigned",
  EN_ROUTE: "Driver en route",
  ARRIVED: "Driver arrived",
  IN_PROGRESS: "Trip in progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

const ACTIVE_STAGES: TripStatus[] = ["PENDING", "QUOTED", "CONFIRMED", "ASSIGNED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED"];

export default async function CustomerPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") redirect("/login");
  const params = await searchParams;

  const customer = await prisma.customer.findUnique({
    where: { userId: session.user.id },
    include: { trips: { orderBy: { scheduledAt: "desc" }, take: 20 } },
  });

  return (
    <DashboardShell
      role={session.user.role}
      name={`${session.user.firstName} ${session.user.lastName}`}
      navLinks={navForRole(session.user.role)}
    >
      {params.booked && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
          <p className="font-bold">Your booking is now in the portal.</p>
          <p className="mt-1 text-emerald-800">We emailed the confirmation and a secure password-setup link. Trip status refreshes automatically.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Customer portal</p>
          <h1 className="mt-1 text-3xl font-semibold">My care journeys</h1>
          <p className="mt-1 text-sm text-muted-foreground">Follow driver assignment and trip progress in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <PortalRefresh />
          <Link
            href="/book"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary-hover"
          >
            Book a ride
          </Link>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {customer?.trips.length ? (
          customer.trips.map((t) => (
            <div key={t.id} className={`rounded-2xl border bg-card p-5 shadow-sm ${params.booked === t.id ? "border-primary ring-2 ring-primary/10" : "border-border"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/trips/${t.id}`} className="font-mono text-sm underline underline-offset-2 hover:text-primary">
                  {t.referenceCode}
                </Link>
                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-primary">{STATUS_LABELS[t.status]}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {t.pickupAddress} → {t.dropoffAddress}
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{formatServiceDateTime(t.scheduledAt)}</p>
                {CANCELLABLE.includes(t.status) && <CancelTripButton tripId={t.id} />}
              </div>
              {!['CANCELLED', 'NO_SHOW'].includes(t.status) && (
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-purple-100">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-primary to-purple-400"
                      style={{ width: `${Math.max(8, ((ACTIVE_STAGES.indexOf(t.status) + 1) / ACTIVE_STAGES.length) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Open the booking reference for the complete status timeline.</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No trips yet.</p>
            <Link href="/book" className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-2">
              Book your first ride
            </Link>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
