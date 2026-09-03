import DashboardShell from "@/components/DashboardShell";
import { auth } from "@/lib/auth";
import { navForRole } from "@/lib/navLinks";
import { DEFAULT_RULE, getActivePricingRule } from "@/lib/pricing";
import { redirect } from "next/navigation";
import { savePricingRule } from "./actions";
import { formatServiceDateTime } from "@/lib/dates";

type PricingValues = typeof DEFAULT_RULE & { name?: string; updatedAt?: Date };
type PricingField = {
  name: keyof typeof DEFAULT_RULE;
  label: string;
  suffix: string;
  step?: string;
};

const GROUPS: { title: string; description: string; fields: PricingField[] }[] = [
  {
    title: "Wheelchair & ambulatory",
    description: "Ambulatory rides use the wheelchair vehicle tier.",
    fields: [
      { name: "wheelchairInCityBase", label: "London base fare", suffix: "$" },
      { name: "wheelchairInCityPerKm", label: "London distance rate", suffix: "$/km" },
      { name: "wheelchairOutCityBase", label: "Outside London base fare", suffix: "$" },
      { name: "wheelchairOutCityPerKmUnder100", label: "First 100 km", suffix: "$/km" },
      { name: "wheelchairOutCityPerKmOver100", label: "After 100 km", suffix: "$/km" },
    ],
  },
  {
    title: "Stretcher",
    description: "Base and distance rates for stretcher transfers.",
    fields: [
      { name: "stretcherInCityBase", label: "London base fare", suffix: "$" },
      { name: "stretcherInCityPerKm", label: "London distance rate", suffix: "$/km" },
      { name: "stretcherOutCityBase", label: "Outside London base fare", suffix: "$" },
      { name: "stretcherOutCityPerKmUnder100", label: "First 100 km", suffix: "$/km" },
      { name: "stretcherOutCityPerKmOver100", label: "After 100 km", suffix: "$/km" },
    ],
  },
  {
    title: "Add-ons & waiting",
    description: "Additional services from the approved 2026 price list.",
    fields: [
      { name: "bariatricAdditionalCharge", label: "Bariatric service add-on", suffix: "$" },
      { name: "bariatricPerKm", label: "Bariatric distance rate", suffix: "$/km" },
      { name: "weekendNightHolidayFlat", label: "Weekend, night or holiday", suffix: "$" },
      { name: "extraAttendantPerHour", label: "Extra attendant", suffix: "$/hr" },
      { name: "oxygenFlat", label: "Oxygen", suffix: "$/trip" },
      { name: "wheelchairWaitPerHour", label: "Wheelchair waiting", suffix: "$/hr" },
      { name: "stretcherWaitPerHour", label: "Stretcher waiting", suffix: "$/hr" },
    ],
  },
  {
    title: "Policies & calculation",
    description: "Discounts, cancellation policy, tax and night hours.",
    fields: [
      { name: "roundTripDiscountPct", label: "Return-leg discount", suffix: "%" },
      { name: "lateCancellationFee", label: "Late cancellation / no-show", suffix: "$" },
      { name: "cancellationWindowHours", label: "Cancellation notice", suffix: "hours", step: "1" },
      { name: "taxRatePct", label: "Tax rate", suffix: "%" },
      { name: "nightStartHour", label: "Night rate starts", suffix: "24h", step: "1" },
      { name: "nightEndHour", label: "Night rate ends", suffix: "24h", step: "1" },
    ],
  },
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) redirect("/login");

  const [rule, params] = await Promise.all([getActivePricingRule(), searchParams]);
  const values = rule as PricingValues;

  return (
    <DashboardShell
      role={session.user.role}
      name={`${session.user.firstName} ${session.user.lastName}`}
      navLinks={navForRole(session.user.role)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Fare management</p>
          <h1 className="mt-2 text-3xl font-semibold">2026 pricing calculator</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            These values power live website estimates and new booking fares. Distances beyond 100 km use the
            lower rate only for kilometres after the first 100.
          </p>
        </div>
        {"updatedAt" in rule && rule.updatedAt && (
          <p className="text-xs text-muted-foreground">Last updated {formatServiceDateTime(rule.updatedAt)}</p>
        )}
      </div>

      {params.saved === "1" && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Pricing was saved and is now active in the booking calculator.
        </div>
      )}
      {params.error === "invalid" && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          One or more values were invalid. All rates must be zero or greater.
        </div>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <RateSummary title="Wheelchair in London" base={values.wheelchairInCityBase} rate={values.wheelchairInCityPerKm} />
        <RateSummary title="Stretcher in London" base={values.stretcherInCityBase} rate={values.stretcherInCityPerKm} />
        <RateSummary title="Bariatric service" base={values.bariatricAdditionalCharge} rate={values.bariatricPerKm} addOn />
      </div>

      <form action={savePricingRule} className="mt-7 space-y-5">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <label className="text-sm font-semibold" htmlFor="name">Rate sheet name</label>
          <input
            id="name"
            name="name"
            defaultValue={values.name ?? "Gray Jay Care 2026"}
            required
            className="mt-2 w-full max-w-md rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </section>

        {GROUPS.map((group) => (
          <section key={group.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">{group.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {group.fields.map((field) => (
                <label key={field.name} className="block text-sm font-medium">
                  {field.label}
                  <span className="mt-2 flex overflow-hidden rounded-xl border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                    <input
                      name={field.name}
                      type="number"
                      min="0"
                      max={field.suffix === "24h" ? "23" : undefined}
                      step={field.step ?? "0.01"}
                      defaultValue={Number(values[field.name])}
                      required
                      className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-sm outline-none"
                    />
                    <span className="flex min-w-14 items-center justify-center border-l border-border bg-muted px-3 text-xs font-semibold text-muted-foreground">
                      {field.suffix}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        ))}

        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-white/95 p-4 shadow-xl backdrop-blur">
          <p className="hidden text-sm text-muted-foreground sm:block">Changes apply to new quotes and bookings immediately.</p>
          <button type="submit" className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover sm:w-auto">
            Save active pricing
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}

function RateSummary({ title, base, rate, addOn = false }: { title: string; base: unknown; rate: unknown; addOn?: boolean }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-white to-purple-50 p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-primary">${Number(base).toFixed(2)}</p>
      <p className="mt-1 text-sm text-muted-foreground">{addOn ? "additional charge" : "base fare"} + ${Number(rate).toFixed(2)}/km</p>
    </div>
  );
}
