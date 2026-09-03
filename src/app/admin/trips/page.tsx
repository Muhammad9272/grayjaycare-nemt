import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import { navForRole } from "@/lib/navLinks";
import type { Prisma, TripStatus } from "@/generated/prisma/client";
import { formatServiceDateTime } from "@/lib/dates";

const STATUSES: TripStatus[] = [
  "PENDING",
  "QUOTED",
  "CONFIRMED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) redirect("/login");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status && STATUSES.includes(params.status as TripStatus) ? (params.status as TripStatus) : undefined;

  const where: Prisma.TripWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { referenceCode: { contains: q } },
            { guestName: { contains: q } },
            { contactName: { contains: q } },
            { medicalRecordNumber: { contains: q } },
            { guestEmail: { contains: q } },
            { guestPhone: { contains: q } },
            { pickupAddress: { contains: q } },
            { dropoffAddress: { contains: q } },
          ],
        }
      : {}),
  };

  const trips = await prisma.trip.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: { include: { user: true } }, driver: { include: { user: true } } },
  });

  return (
    <DashboardShell
      role={session.user.role}
      name={`${session.user.firstName} ${session.user.lastName}`}
      navLinks={navForRole(session.user.role)}
    >
      <h1 className="text-2xl font-semibold">All trips</h1>
      <p className="mt-1 text-sm text-muted-foreground">{trips.length} result{trips.length === 1 ? "" : "s"}</p>

      <form method="get" className="mt-6 flex flex-wrap gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search reference, name, phone, address..."
          className="min-w-[220px] flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
        >
          Search
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {trips.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No trips match your search.
          </div>
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
                {t.guestName ?? (t.customer ? `${t.customer.user.firstName} ${t.customer.user.lastName}` : "—")}
                {t.driver && ` · driver: ${t.driver.user.firstName} ${t.driver.user.lastName}`}
              </p>
            </div>
            <p className="text-muted-foreground">{formatServiceDateTime(t.scheduledAt)}</p>
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}
