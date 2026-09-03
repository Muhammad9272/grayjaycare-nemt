"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AddressAutocomplete, { type ResolvedPlace } from "@/components/AddressAutocomplete";
import LongDateInput from "@/components/LongDateInput";
import { serviceDateTimeInputValue, torontoLocalDateTimeToIso } from "@/lib/dates";

type MobilityType = "AMBULATORY" | "WHEELCHAIR" | "STRETCHER";

type QuoteResponse = {
  distanceKm: number | null;
  breakdown: { total: number } | null;
  message?: string;
};

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15";
const labelClass = "text-sm font-medium text-foreground";

export default function HospitalBookingForm({ billingEmail, contactName }: { billingEmail: string; contactName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPlace, setPickupPlace] = useState<ResolvedPlace | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffPlace, setDropoffPlace] = useState<ResolvedPlace | null>(null);
  const [manualDistanceKm, setManualDistanceKm] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [mobilityType, setMobilityType] = useState<MobilityType>("AMBULATORY");
  const [isOutOfCity, setIsOutOfCity] = useState(false);
  const [isBariatric, setIsBariatric] = useState(false);
  const [requiresOxygen, setRequiresOxygen] = useState(false);
  const [extraAttendant, setExtraAttendant] = useState(false);
  const [extraAttendantHours, setExtraAttendantHours] = useState("1");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minimumPickupTime] = useState(() => serviceDateTimeInputValue(new Date(Date.now() + 5 * 60_000)));

  const readyForQuote = useMemo(
    () => pickupAddress.length > 3 && dropoffAddress.length > 3 && scheduledAt.length > 0,
    [pickupAddress, dropoffAddress, scheduledAt],
  );

  useEffect(() => {
    if (!readyForQuote) return;
    const timeout = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const res = await fetch("/api/pricing/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pickupAddress,
            dropoffAddress,
            distanceKm: manualDistanceKm ? Number(manualDistanceKm) : undefined,
            waitMinutes: 0,
            mobilityType,
            isBariatric,
            isOutOfCity,
            requiresOxygen,
            extraAttendant,
            extraAttendantHours: extraAttendant ? Number(extraAttendantHours || 0) : 0,
            scheduledAt: torontoLocalDateTimeToIso(scheduledAt),
          }),
        });
        setQuote(await res.json());
      } catch {
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [
    readyForQuote,
    pickupAddress,
    dropoffAddress,
    manualDistanceKm,
    mobilityType,
    isBariatric,
    isOutOfCity,
    requiresOxygen,
    extraAttendant,
    extraAttendantHours,
    scheduledAt,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const distanceKm = manualDistanceKm ? Number(manualDistanceKm) : quote?.distanceKm;
    if (!distanceKm) {
      setError("We couldn't determine the trip distance. Please enter an estimated distance in km.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress,
          pickupLat: pickupPlace?.latitude,
          pickupLng: pickupPlace?.longitude,
          dropoffAddress,
          dropoffLat: dropoffPlace?.latitude,
          dropoffLng: dropoffPlace?.longitude,
          distanceKm,
          waitMinutes: 0,
          mobilityType,
          isBariatric,
          isOutOfCity,
          requiresOxygen,
          extraAttendant,
          extraAttendantHours: extraAttendant ? Number(extraAttendantHours || 0) : 0,
          scheduledAt: torontoLocalDateTimeToIso(scheduledAt),
          guestName: patientName,
          contactName,
          guestEmail: billingEmail,
          guestPhone: patientPhone,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        setError("Please check the form for errors.");
        return;
      }
      setPickupAddress("");
      setPickupPlace(null);
      setDropoffAddress("");
      setDropoffPlace(null);
      setManualDistanceKm("");
      setScheduledAt("");
      setIsBariatric(false);
      setIsOutOfCity(false);
      setRequiresOxygen(false);
      setExtraAttendant(false);
      setPatientName("");
      setPatientPhone("");
      setNotes("");
      setQuote(null);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
      >
        Book a trip for a patient
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">New patient trip</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Pickup address</label>
          <AddressAutocomplete inputClassName={inputClass} value={pickupAddress} onChange={setPickupAddress} onPlaceResolved={setPickupPlace} required />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Drop-off address</label>
          <AddressAutocomplete inputClassName={inputClass} value={dropoffAddress} onChange={setDropoffAddress} onPlaceResolved={setDropoffPlace} required />
        </div>
        <div>
          <label className={labelClass}>Pickup date & time</label>
          <LongDateInput
            includeTime
            min={minimumPickupTime}
            ariaLabel="Pickup date and time"
            controlClassName={inputClass}
            value={scheduledAt}
            onChange={setScheduledAt}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Service type</label>
          <select className={inputClass} value={mobilityType} onChange={(e) => setMobilityType(e.target.value as MobilityType)}>
            <option value="AMBULATORY">Ambulatory</option>
            <option value="WHEELCHAIR">Wheelchair</option>
            <option value="STRETCHER">Stretcher</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Patient name</label>
          <input className={inputClass} value={patientName} onChange={(e) => setPatientName(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Patient phone</label>
          <input className={inputClass} value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Trip location</label>
          <select
            className={inputClass}
            value={isOutOfCity ? "out" : "in"}
            onChange={(e) => setIsOutOfCity(e.target.value === "out")}
          >
            <option value="in">Within London, ON</option>
            <option value="out">Outside London, ON</option>
          </select>
        </div>
        <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5">
          <input type="checkbox" checked={isBariatric} onChange={(e) => setIsBariatric(e.target.checked)} className="accent-primary" />
          <span className={labelClass}>Bariatric</span>
        </label>
        <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5">
          <input type="checkbox" checked={requiresOxygen} onChange={(e) => setRequiresOxygen(e.target.checked)} className="accent-primary" />
          <span className={labelClass}>Requires oxygen</span>
        </label>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2.5">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={extraAttendant} onChange={(e) => setExtraAttendant(e.target.checked)} className="accent-primary" />
            <span className={labelClass}>Extra attendant</span>
          </label>
          {extraAttendant && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              for
              <input
                type="number"
                min={0.5}
                step="0.5"
                value={extraAttendantHours}
                onChange={(e) => setExtraAttendantHours(e.target.value)}
                className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm"
              />
              hour(s)
            </label>
          )}
        </div>
        {readyForQuote && quote && quote.distanceKm == null && (
          <div className="sm:col-span-2">
            <label className={labelClass}>Estimated distance (km)</label>
            <input
              type="number"
              min={0}
              step="0.1"
              className={inputClass}
              value={manualDistanceKm}
              onChange={(e) => setManualDistanceKm(e.target.value)}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <label className={labelClass}>Notes (optional)</label>
          <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="sm:col-span-2 rounded-lg bg-muted p-3 text-sm">
          {quoteLoading && <span className="text-muted-foreground">Calculating fare...</span>}
          {!quoteLoading && readyForQuote && quote?.breakdown && (
            <span>
              Estimated fare: <span className="font-semibold text-primary">${quote.breakdown.total.toFixed(2)}</span>
            </span>
          )}
          {!quoteLoading && readyForQuote && quote?.message && <span className="text-warning-fg">{quote.message}</span>}
          {!quoteLoading && !readyForQuote && (
            <span className="text-muted-foreground">Fill in pickup, drop-off, and time for a fare estimate.</span>
          )}
        </div>

        {error && <p className="sm:col-span-2 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger-fg">{error}</p>}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Request trip"}
          </button>
        </div>
      </div>
    </form>
  );
}
