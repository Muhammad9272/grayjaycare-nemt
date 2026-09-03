import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import { navForRole } from "@/lib/navLinks";
import { formatServiceDate, parseTorontoDate, serviceDateInputValue } from "@/lib/dates";
import LongDateInput from "@/components/LongDateInput";

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"].includes(session.user.role)) redirect("/login");

  const params = await searchParams;
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const defaultFromValue = serviceDateInputValue(defaultFrom);
  const defaultToValue = serviceDateInputValue(today);
  const requestedFromValue = params.from ?? defaultFromValue;
  const requestedToValue = params.to ?? defaultToValue;
  const parsedFrom = parseTorontoDate(requestedFromValue);
  const parsedToExclusive = parseTorontoDate(requestedToValue, true);
  const validRange = Boolean(parsedFrom && parsedToExclusive && parsedFrom < parsedToExclusive);
  const fromValue = validRange ? requestedFromValue : defaultFromValue;
  const toValue = validRange ? requestedToValue : defaultToValue;
  const from = validRange ? parsedFrom! : parseTorontoDate(defaultFromValue)!;
  const toExclusive = validRange ? parsedToExclusive! : parseTorontoDate(defaultToValue, true)!;

  const [completedTrips, cancelledCount, noShowCount] = await Promise.all([
    prisma.trip.findMany({
      where: { status: "COMPLETED", updatedAt: { gte: from, lt: toExclusive } },
      orderBy: { updatedAt: "desc" },
      include: {
        customer: { include: { user: true } },
        hospital: true,
        driver: { include: { user: true } },
        vehicle: true,
        invoice: { include: { payments: { where: { status: "SUCCEEDED" } } } },
      },
    }),
    prisma.trip.count({ where: { status: "CANCELLED", updatedAt: { gte: from, lt: toExclusive } } }),
    prisma.trip.count({ where: { status: "NO_SHOW", updatedAt: { gte: from, lt: toExclusive } } }),
  ]);

  const fares = completedTrips.map((t) => Number(t.finalFare ?? t.estimatedFare ?? 0));
  const totalRevenue = fares.reduce((sum, f) => sum + f, 0);
  const averageFare = fares.length ? totalRevenue / fares.length : 0;

  const driverStats = new Map<string, { name: string; trips: number; revenue: number }>();
  const vehicleStats = new Map<string, { label: string; trips: number; km: number }>();
  for (const t of completedTrips) {
    if (t.driver) {
      const key = t.driver.id;
      const existing = driverStats.get(key) ?? {
        name: `${t.driver.user.firstName} ${t.driver.user.lastName}`,
        trips: 0,
        revenue: 0,
      };
      existing.trips += 1;
      existing.revenue += Number(t.finalFare ?? t.estimatedFare ?? 0);
      driverStats.set(key, existing);
    }
    if (t.vehicle) {
      const key = t.vehicle.id;
      const existing = vehicleStats.get(key) ?? {
        label: `${t.vehicle.plateNumber} — ${t.vehicle.make} ${t.vehicle.model}`,
        trips: 0,
        km: 0,
      };
      existing.trips += 1;
      existing.km += Number(t.distanceKm ?? 0);
      vehicleStats.set(key, existing);
    }
  }
  const driverRows = [...driverStats.values()].sort((a, b) => b.revenue - a.revenue);
  const vehicleRows = [...vehicleStats.values()].sort((a, b) => b.trips - a.trips);

  const csvHref = `/api/admin/reports/trips-csv?from=${fromValue}&to=${toValue}`;

  return (
    <DashboardShell
      role={session.user.role}
      name={`${session.user.firstName} ${session.user.lastName}`}
      navLinks={navForRole(session.user.role)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Accounting</h1>
          <p className="mt-1 text-sm text-muted-foreground">Revenue and trip reporting based on completed trips.</p>
        </div>
        <a
          href={csvHref}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted"
        >
          Export CSV
        </a>
      </div>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div>
          <label className="text-sm font-medium text-foreground">From</label>
          <LongDateInput
            name="from"
            defaultValue={fromValue}
            ariaLabel="Report from date"
            controlClassName="mt-1 block rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
            yearsBack={10}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">To</label>
          <LongDateInput
            name="to"
            defaultValue={toValue}
            ariaLabel="Report to date"
            controlClassName="mt-1 block rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
            yearsBack={10}
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
        >
          Apply
        </button>
      </form>
      {!validRange && (params.from || params.to) && (
        <p className="mt-3 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg">The requested date range was invalid, so the last 30 days are shown.</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Revenue" value={`$${totalRevenue.toFixed(2)}`} />
        <Stat label="Completed trips" value={String(completedTrips.length)} />
        <Stat label="Cancelled" value={String(cancelledCount)} />
        <Stat label="No-shows" value={String(noShowCount)} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Average fare: ${averageFare.toFixed(2)}</p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Driver utilization</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Driver</th>
                  <th className="px-4 py-2.5 text-right font-medium">Trips</th>
                  <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {driverRows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      No completed trips in this range.
                    </td>
                  </tr>
                )}
                {driverRows.map((d) => (
                  <tr key={d.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">{d.name}</td>
                    <td className="px-4 py-2.5 text-right">{d.trips}</td>
                    <td className="px-4 py-2.5 text-right font-medium">${d.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Vehicle utilization</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Vehicle</th>
                  <th className="px-4 py-2.5 text-right font-medium">Trips</th>
                  <th className="px-4 py-2.5 text-right font-medium">Distance</th>
                </tr>
              </thead>
              <tbody>
                {vehicleRows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      No completed trips in this range.
                    </td>
                  </tr>
                )}
                {vehicleRows.map((v) => (
                  <tr key={v.label} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">{v.label}</td>
                    <td className="px-4 py-2.5 text-right">{v.trips}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{v.km.toFixed(0)} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Completed trips</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Completed</th>
              <th className="px-4 py-3 font-medium">Rider</th>
              <th className="px-4 py-3 font-medium">Route</th>
              <th className="px-4 py-3 text-right font-medium">Fare</th>
            </tr>
          </thead>
          <tbody>
            {completedTrips.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No completed trips in this range.
                </td>
              </tr>
            )}
            {completedTrips.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-mono">
                  <Link href={`/trips/${t.id}`} className="underline underline-offset-2 hover:text-primary">
                    {t.referenceCode}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatServiceDate(t.updatedAt)}
                </td>
                <td className="px-4 py-3">
                  {t.guestName ?? (t.customer ? `${t.customer.user.firstName} ${t.customer.user.lastName}` : "—")}
                  {t.hospital && <span className="text-muted-foreground"> · {t.hospital.name}</span>}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                  {t.pickupAddress} → {t.dropoffAddress}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  <span className="block">${Number(t.finalFare ?? t.estimatedFare ?? 0).toFixed(2)}</span>
                  <span className="text-xs font-normal text-muted-foreground">{t.invoice?.status ?? "Not invoiced"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
