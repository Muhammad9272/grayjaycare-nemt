"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import AddressAutocomplete, { type ResolvedPlace } from "@/components/AddressAutocomplete";
import LongDateInput from "@/components/LongDateInput";
import { serviceDateTimeInputValue, torontoLocalDateTimeToIso } from "@/lib/dates";
import styles from "./booking.module.css";

type MobilityType = "AMBULATORY" | "WHEELCHAIR" | "STRETCHER";
type PickupTimePreference = "SPECIFIC" | "ASAP" | "FLEXIBLE";
type ReturnTripType = "ONE_WAY" | "SCHEDULED_RETURN" | "WAIT_AND_RETURN" | "CALL_FOR_RETURN";
type PaymentPreference = "CASH" | "CARD" | "E_TRANSFER" | "DIRECT_DEPOSIT" | "INVOICE" | "OTHER";
type BookingChannel = "PUBLIC" | "PHONE" | "HOSPITAL";

type Breakdown = {
  baseFare: number;
  distanceCost: number;
  bariatricCharge: number;
  waitCost: number;
  oxygenCharge: number;
  attendantCharge: number;
  weekendNightHolidayCharge: number;
  roundTripDiscount: number;
  subtotal: number;
  tax: number;
  total: number;
};

type QuoteResponse = {
  distanceKm: number | null;
  distanceSource: "google" | "manual" | null;
  breakdown: Breakdown | null;
  message?: string;
};

const SERVICE_OPTIONS: { value: MobilityType; title: string; copy: string; rate: string }[] = [
  { value: "AMBULATORY", title: "Ambulatory", copy: "Walk-on passenger with caring assistance", rate: "Wheelchair rate" },
  { value: "WHEELCHAIR", title: "Wheelchair", copy: "Accessible van and securement support", rate: "From $50" },
  { value: "STRETCHER", title: "Stretcher", copy: "Specialized transfer with trained attendants", rate: "From $120" },
];

export default function BookPage() {
  return (
    <Suspense fallback={null}>
      <BookingPageContent />
    </Suspense>
  );
}

function BookingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSource = searchParams.get("source");
  const bookingChannel: BookingChannel = requestedSource === "phone" ? "PHONE" : requestedSource === "hospital" ? "HOSPITAL" : "PUBLIC";
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPlace, setPickupPlace] = useState<ResolvedPlace | null>(null);
  const [pickupDepartment, setPickupDepartment] = useState("");
  const [pickupRoom, setPickupRoom] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffPlace, setDropoffPlace] = useState<ResolvedPlace | null>(null);
  const [dropoffDepartment, setDropoffDepartment] = useState("");
  const [dropoffRoom, setDropoffRoom] = useState("");
  const [manualDistanceKm, setManualDistanceKm] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [pickupTimePreference, setPickupTimePreference] = useState<PickupTimePreference>("SPECIFIC");
  const [mobilityType, setMobilityType] = useState<MobilityType>("AMBULATORY");
  const [isOutOfCity, setIsOutOfCity] = useState(false);
  const [isBariatric, setIsBariatric] = useState(false);
  const [requiresOxygen, setRequiresOxygen] = useState(false);
  const [requiresIsolation, setRequiresIsolation] = useState(false);
  const [hasDnr, setHasDnr] = useState(false);
  const [escortCount, setEscortCount] = useState("0");
  const [extraAttendant, setExtraAttendant] = useState(false);
  const [extraAttendantHours, setExtraAttendantHours] = useState("1");
  const [waitMinutes, setWaitMinutes] = useState("0");
  const [passengerWeightKg, setPassengerWeightKg] = useState("");
  const [notes, setNotes] = useState("");
  const [returnTripType, setReturnTripType] = useState<ReturnTripType>("ONE_WAY");
  const [returnScheduledAt, setReturnScheduledAt] = useState("");
  const [contactName, setContactName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [medicalRecordNumber, setMedicalRecordNumber] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [contactPhoneExtension, setContactPhoneExtension] = useState("");
  const [paymentPreference, setPaymentPreference] = useState<PaymentPreference | "">("");
  const [medicalDocumentsAvailable, setMedicalDocumentsAvailable] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [returnQuote, setReturnQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    referenceCode: string;
    estimatedFare: number;
    emailSent: boolean;
  } | null>(null);
  const [minimumPickupTime] = useState(() => serviceDateTimeInputValue(new Date(Date.now() + 5 * 60_000)));

  const readyForQuote = useMemo(
    () => pickupAddress.length > 3 && dropoffAddress.length > 3 && scheduledAt.length > 0,
    [pickupAddress, dropoffAddress, scheduledAt],
  );
  const hasReturnLeg = returnTripType === "SCHEDULED_RETURN" || returnTripType === "WAIT_AND_RETURN";
  const isRoundTrip = returnTripType !== "ONE_WAY";
  const readyForReturnQuote = hasReturnLeg && readyForQuote && returnScheduledAt.length > 0;

  const commonFareFields = {
    pickupAddress,
    pickupLat: pickupPlace?.latitude,
    pickupLng: pickupPlace?.longitude,
    dropoffAddress,
    dropoffLat: dropoffPlace?.latitude,
    dropoffLng: dropoffPlace?.longitude,
    distanceKm: manualDistanceKm ? Number(manualDistanceKm) : undefined,
    waitMinutes: Number(waitMinutes || 0),
    mobilityType,
    isBariatric,
    isOutOfCity,
    requiresOxygen,
    extraAttendant,
    extraAttendantHours: extraAttendant ? Number(extraAttendantHours || 0) : 0,
  };

  useEffect(() => {
    if (!readyForQuote) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const res = await fetch("/api/pricing/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...commonFareFields, scheduledAt: torontoLocalDateTimeToIso(scheduledAt) }),
          signal: controller.signal,
        });
        setQuote(await res.json());
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setQuote(null);
      } finally {
        if (!controller.signal.aborted) setQuoteLoading(false);
      }
    }, 450);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
    // The primitive dependencies below intentionally define the quote inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    readyForQuote,
    pickupAddress,
    dropoffAddress,
    manualDistanceKm,
    waitMinutes,
    mobilityType,
    isBariatric,
    isOutOfCity,
    requiresOxygen,
    extraAttendant,
    extraAttendantHours,
    scheduledAt,
  ]);

  useEffect(() => {
    if (!readyForReturnQuote) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch("/api/pricing/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...commonFareFields,
            scheduledAt: torontoLocalDateTimeToIso(returnScheduledAt),
            isReturnLeg: true,
          }),
          signal: controller.signal,
        });
        setReturnQuote(await res.json());
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setReturnQuote(null);
      }
    }, 450);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
    // The primitive dependencies below intentionally define the return quote inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    readyForReturnQuote,
    pickupAddress,
    dropoffAddress,
    manualDistanceKm,
    waitMinutes,
    mobilityType,
    isBariatric,
    isOutOfCity,
    requiresOxygen,
    extraAttendant,
    extraAttendantHours,
    returnScheduledAt,
  ]);

  const combinedTotal =
    (quote?.breakdown?.total ?? 0) + (hasReturnLeg ? (returnQuote?.breakdown?.total ?? 0) : 0);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const distanceKm = manualDistanceKm ? Number(manualDistanceKm) : quote?.distanceKm;
    if (!distanceKm) {
      setError("We couldn't determine the trip distance. Please enter an estimated distance in kilometres.");
      return;
    }
    if (hasReturnLeg && !returnScheduledAt) {
      setError("Please choose a return date and time for your round trip.");
      return;
    }

    setSubmitting(true);
    try {
      const requestChannel = bookingChannel;
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...commonFareFields,
          source: requestChannel === "PHONE" ? "PHONE" : undefined,
          distanceKm,
          scheduledAt: torontoLocalDateTimeToIso(scheduledAt),
          contactName,
          guestName: patientName,
          guestEmail,
          guestPhone,
          contactPhoneExtension: contactPhoneExtension || undefined,
          medicalRecordNumber: medicalRecordNumber || undefined,
          pickupDepartment: pickupDepartment || undefined,
          pickupRoom: pickupRoom || undefined,
          dropoffDepartment: dropoffDepartment || undefined,
          dropoffRoom: dropoffRoom || undefined,
          pickupTimePreference,
          returnTripType,
          escortCount: Number(escortCount),
          requiresIsolation,
          hasDnr,
          paymentPreference: paymentPreference || undefined,
          medicalDocumentsAvailable,
          passengerWeightKg: passengerWeightKg ? Number(passengerWeightKg) : undefined,
          notes: notes || undefined,
          isRoundTrip,
          returnScheduledAt: hasReturnLeg ? torontoLocalDateTimeToIso(returnScheduledAt) : undefined,
          returnDistanceKm: hasReturnLeg ? distanceKm : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(typeof data?.error === "string" ? data.error : "Please check the form for errors.");
        return;
      }
      const data = await res.json();
      if (requestChannel === "PHONE") {
        router.push(`/dispatch?booked=${data.tripId}`);
        router.refresh();
        return;
      }
      if (requestChannel === "HOSPITAL") {
        router.push(`/hospital?booked=${data.tripId}`);
        router.refresh();
        return;
      }
      if (data.accessToken) {
        const accessResult = await signIn("booking-access", {
          token: data.accessToken,
          redirect: false,
        });
        if (!accessResult?.error) {
          router.push(data.portalPath ?? "/portal");
          router.refresh();
          return;
        }
      } else if (data.portalReady) {
        router.push(data.portalPath ?? "/portal");
        router.refresh();
        return;
      }

      setConfirmation({
        referenceCode: data.referenceCode,
        estimatedFare: data.estimatedFare,
        emailSent: Boolean(data.emailSent),
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Something went wrong. Please try again or call us for assistance.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <>
        <PublicHeader />
        <main className={styles.confirmationPage}>
          <div className={styles.confirmationCard}>
            <span className={styles.confirmationIcon}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className={styles.eyebrow}>Booking request received</p>
            <h1>Your care journey is in our hands.</h1>
            <p>
              A dispatcher will contact you within 30 minutes to confirm the details.
              {confirmation.emailSent ? " We also sent a copy to your email address." : " Please save the reference below."}
            </p>
            <div className={styles.confirmationDetails}>
              <span><small>Booking reference</small><strong>{confirmation.referenceCode}</strong></span>
              <span><small>Estimated fare</small><strong>${confirmation.estimatedFare.toFixed(2)}</strong></span>
            </div>
            <div className={styles.confirmationActions}>
              <Link href="/" className={styles.secondaryButton}>Back to home</Link>
              <a href="tel:+15199335090" className={styles.primaryButton}>Call (519) 933-5090</a>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <PublicHeader />
      <main className={styles.page}>
        {bookingChannel !== "PUBLIC" && (
          <div className={styles.channelBanner} role="status">
            <span>
              <strong>{bookingChannel === "PHONE" ? "Dispatcher phone booking" : "Hospital portal booking"}</strong>
              This request uses the same complete fields and live pricing as the public booking form.
            </span>
            <Link href={bookingChannel === "PHONE" ? "/dispatch" : "/hospital"}>Return to portal</Link>
          </div>
        )}
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>24/7 non-emergency medical transport</p>
            <h1>Book a safe, caring ride</h1>
            <p className={styles.heroDescription}>
              Tell us what your passenger needs and receive a live estimate based on Gray Jay Care&apos;s approved
              2026 price list.
            </p>
            <div className={styles.trustRow}>
              <span><CheckIcon /> No account required</span>
              <span><CheckIcon /> Live fare estimate</span>
              <span><CheckIcon /> Dispatcher confirmation</span>
            </div>
          </div>
          <div className={styles.heroHelp}>
            <span>Prefer to book by phone?</span>
            <a href="tel:+15199335090">(519) 933-5090</a>
            <small>Our team is available 24 hours a day.</small>
            <small className={styles.emergencyNote}><strong>Medical emergency?</strong> Call 911. Gray Jay Care is not an ambulance service.</small>
          </div>
        </section>

        <form onSubmit={handleSubmit} className={styles.bookingLayout}>
          <div className={styles.formColumn}>
            <section className={styles.sectionCard}>
              <SectionHeader number="01" title="Contact information" copy="Who should our dispatcher contact to confirm the ride?" />
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Contact person&apos;s full name</span>
                  <input className={styles.input} autoComplete="name" value={contactName} onChange={(event) => setContactName(event.target.value)} required />
                </label>
                <label className={styles.field}>
                  <span>Phone number</span>
                  <input type="tel" className={styles.input} autoComplete="tel" value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} required />
                </label>
                <label className={styles.field}>
                  <span>Phone extension <small>(optional)</small></span>
                  <input className={styles.input} inputMode="numeric" value={contactPhoneExtension} onChange={(event) => setContactPhoneExtension(event.target.value)} placeholder="e.g. 214" />
                </label>
                <label className={styles.field}>
                  <span>Email address</span>
                  <input type="email" className={styles.input} autoComplete="email" value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} required />
                  <small>We&apos;ll send the booking reference and portal access here.</small>
                </label>
              </div>
            </section>

            <section className={styles.sectionCard}>
              <SectionHeader number="02" title="Trip details" copy="Where and when should we meet the patient?" />
              <div className={styles.formGrid}>
                <label className={`${styles.field} ${styles.fullField}`}>
                  <span>Pickup address</span>
                  <AddressAutocomplete
                    inputClassName={styles.input}
                    value={pickupAddress}
                    onChange={setPickupAddress}
                    onPlaceResolved={setPickupPlace}
                    placeholder="123 Main St, London, ON"
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>Pickup department <small>(if hospital/facility)</small></span>
                  <input className={styles.input} value={pickupDepartment} onChange={(event) => setPickupDepartment(event.target.value)} placeholder="e.g. Endoscopy Unit" />
                </label>
                <label className={styles.field}>
                  <span>Pickup room <small>(optional)</small></span>
                  <input className={styles.input} value={pickupRoom} onChange={(event) => setPickupRoom(event.target.value)} placeholder="e.g. Room 200" />
                </label>
                <label className={`${styles.field} ${styles.fullField}`}>
                  <span>Drop-off address</span>
                  <AddressAutocomplete
                    inputClassName={styles.input}
                    value={dropoffAddress}
                    onChange={setDropoffAddress}
                    onPlaceResolved={setDropoffPlace}
                    placeholder="Hospital, clinic or home address"
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>Drop-off department <small>(if hospital/facility)</small></span>
                  <input className={styles.input} value={dropoffDepartment} onChange={(event) => setDropoffDepartment(event.target.value)} placeholder="e.g. Imaging" />
                </label>
                <label className={styles.field}>
                  <span>Drop-off room <small>(optional)</small></span>
                  <input className={styles.input} value={dropoffRoom} onChange={(event) => setDropoffRoom(event.target.value)} placeholder="e.g. Room 310" />
                </label>
                <div className={`${styles.field} ${styles.fullField}`}>
                  <span>Pickup date and time</span>
                  <LongDateInput includeTime min={minimumPickupTime} ariaLabel="Pickup date and time" controlClassName={styles.input} value={scheduledAt} onChange={setScheduledAt} required />
                </div>
                <label className={styles.field}>
                  <span>Preferred timing</span>
                  <select className={styles.input} value={pickupTimePreference} onChange={(event) => setPickupTimePreference(event.target.value as PickupTimePreference)}>
                    <option value="SPECIFIC">Specific time</option>
                    <option value="ASAP">First available (ASAP)</option>
                    <option value="FLEXIBLE">Any time that day</option>
                  </select>
                </label>
                <div className={styles.field}>
                  <span>Service area</span>
                  <div className={styles.segmentedControl}>
                    <button type="button" className={!isOutOfCity ? styles.segmentActive : ""} onClick={() => setIsOutOfCity(false)}>London</button>
                    <button type="button" className={isOutOfCity ? styles.segmentActive : ""} onClick={() => setIsOutOfCity(true)}>Outside London</button>
                  </div>
                </div>
                <fieldset className={`${styles.field} ${styles.fullField}`}>
                  <legend>Choose service type</legend>
                  <div className={styles.serviceGrid}>
                    {SERVICE_OPTIONS.map((option) => (
                      <label key={option.value} className={`${styles.serviceChoice} ${mobilityType === option.value ? styles.choiceActive : ""}`}>
                        <input type="radio" name="mobilityType" value={option.value} checked={mobilityType === option.value} onChange={() => setMobilityType(option.value)} />
                        <span className={styles.radioMark} />
                        <strong>{option.title}</strong>
                        <small>{option.copy}</small>
                        <em>{option.rate}</em>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className={`${styles.roundTripBox} ${styles.fullField}`}>
                  <label className={styles.field}>
                    <span>One-way or return trip?</span>
                    <select className={styles.input} value={returnTripType} onChange={(event) => setReturnTripType(event.target.value as ReturnTripType)}>
                      <option value="ONE_WAY">One-way trip</option>
                      <option value="SCHEDULED_RETURN">Return at a scheduled time</option>
                      <option value="WAIT_AND_RETURN">Wait and return</option>
                      <option value="CALL_FOR_RETURN">Call when ready for return</option>
                    </select>
                    <small>Scheduled return legs receive the approved return-trip discount.</small>
                  </label>
                  {hasReturnLeg && (
                    <div className={styles.field}>
                      <span>Return pickup date and time</span>
                      <LongDateInput includeTime min={scheduledAt || minimumPickupTime} ariaLabel="Return pickup date and time" controlClassName={styles.input} value={returnScheduledAt} onChange={setReturnScheduledAt} required />
                    </div>
                  )}
                </div>
                {readyForQuote && quote && quote.distanceKm == null && (
                  <label className={`${styles.field} ${styles.fullField}`}>
                    <span>Estimated trip distance (km)</span>
                    <small>Automatic distance lookup is unavailable. Enter the approximate one-way distance.</small>
                    <input type="number" min="0.1" step="0.1" className={styles.input} value={manualDistanceKm} onChange={(event) => setManualDistanceKm(event.target.value)} required />
                  </label>
                )}
              </div>
            </section>

            <section className={styles.sectionCard}>
              <SectionHeader number="03" title="Patient information" copy="Help us prepare the right vehicle and care team." />
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Patient&apos;s full name</span>
                  <input className={styles.input} value={patientName} onChange={(event) => setPatientName(event.target.value)} required />
                </label>
                <label className={styles.field}>
                  <span>Medical record number (MRN) <small>(optional)</small></span>
                  <input className={styles.input} value={medicalRecordNumber} onChange={(event) => setMedicalRecordNumber(event.target.value)} autoComplete="off" />
                </label>
              </div>
              <div className={styles.optionGrid}>
                <label className={`${styles.optionCard} ${isBariatric ? styles.optionActive : ""}`}>
                  <input type="checkbox" checked={isBariatric} onChange={(event) => setIsBariatric(event.target.checked)} />
                  <OptionIcon type="care" />
                  <span><strong>Over 250 lb / bariatric</strong><small>Specialized equipment and support</small></span>
                </label>
                <label className={`${styles.optionCard} ${requiresOxygen ? styles.optionActive : ""}`}>
                  <input type="checkbox" checked={requiresOxygen} onChange={(event) => setRequiresOxygen(event.target.checked)} />
                  <OptionIcon type="oxygen" />
                  <span><strong>Oxygen required</strong><small>Oxygen available during transport</small></span>
                </label>
                <label className={`${styles.optionCard} ${extraAttendant ? styles.optionActive : ""}`}>
                  <input type="checkbox" checked={extraAttendant} onChange={(event) => setExtraAttendant(event.target.checked)} />
                  <OptionIcon type="person" />
                  <span><strong>Extra attendant</strong><small>Additional hands-on assistance</small></span>
                </label>
              </div>
              <div className={`${styles.formGrid} ${styles.spacedGrid}`}>
                <label className={styles.field}>
                  <span>People escorting the patient</span>
                  <select className={styles.input} value={escortCount} onChange={(event) => setEscortCount(event.target.value)}>
                    {[0, 1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Isolation precautions?</span>
                  <select className={styles.input} value={requiresIsolation ? "yes" : "no"} onChange={(event) => setRequiresIsolation(event.target.value === "yes")}>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>DNR paperwork available?</span>
                  <select className={styles.input} value={hasDnr ? "yes" : "no"} onChange={(event) => setHasDnr(event.target.value === "yes")}>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Payment preference</span>
                  <select className={styles.input} value={paymentPreference} onChange={(event) => setPaymentPreference(event.target.value as PaymentPreference)} required>
                    <option value="">Select payment preference</option>
                    <option value="CARD">Debit / credit card</option>
                    <option value="CASH">Cash</option>
                    <option value="E_TRANSFER">E-transfer</option>
                    <option value="DIRECT_DEPOSIT">Direct deposit</option>
                    <option value="INVOICE">Invoice / account</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Expected waiting time</span>
                  <span className={styles.inputWithSuffix}>
                    <input type="number" min="0" className={styles.input} value={waitMinutes} onChange={(event) => setWaitMinutes(event.target.value)} />
                    <b>minutes</b>
                  </span>
                </label>
                <label className={styles.field}>
                  <span>Passenger weight <small>(optional)</small></span>
                  <span className={styles.inputWithSuffix}>
                    <input type="number" min="0" className={styles.input} value={passengerWeightKg} onChange={(event) => setPassengerWeightKg(event.target.value)} />
                    <b>kg</b>
                  </span>
                </label>
                {extraAttendant && (
                  <label className={styles.field}>
                    <span>Extra attendant time</span>
                    <span className={styles.inputWithSuffix}>
                      <input type="number" min="0.5" step="0.5" className={styles.input} value={extraAttendantHours} onChange={(event) => setExtraAttendantHours(event.target.value)} />
                      <b>hours</b>
                    </span>
                  </label>
                )}
                <label className={`${styles.optionCard} ${styles.fullField} ${medicalDocumentsAvailable ? styles.optionActive : ""}`}>
                  <input type="checkbox" checked={medicalDocumentsAvailable} onChange={(event) => setMedicalDocumentsAvailable(event.target.checked)} />
                  <OptionIcon type="care" />
                  <span><strong>Medical documents are available</strong><small>For privacy, dispatch will arrange secure collection; do not email sensitive documents.</small></span>
                </label>
                <label className={`${styles.field} ${styles.fullField}`}>
                  <span>Driver or dispatcher notes <small>(optional)</small></span>
                  <textarea className={styles.input} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Entrance instructions, appointment details, transfer assistance or anything else we should know." />
                </label>
              </div>
            </section>
          </div>

          <aside className={styles.summaryColumn}>
            <div className={styles.fareCard} aria-live="polite">
              <div className={styles.fareHeader}>
                <span><small>Live estimate</small><strong>Your trip fare</strong></span>
                <b>2026 rates</b>
              </div>
              <div className={styles.fareBody}>
                {quoteLoading && <LoadingFare />}
                {!quoteLoading && !readyForQuote && (
                  <div className={styles.emptyFare}>
                    <FareIcon />
                    <strong>Ready when you are</strong>
                    <p>Add the addresses and pickup time to calculate your estimate.</p>
                  </div>
                )}
                {!quoteLoading && readyForQuote && quote?.message && (
                  <p className={styles.quoteMessage}>{quote.message}</p>
                )}
                {!quoteLoading && quote?.breakdown && (
                  <div className={styles.fareBreakdown}>
                    {quote.distanceKm && (
                      <div className={styles.distancePill}>
                        <span>{quote.distanceKm.toFixed(1)} km one way</span>
                        <small>{quote.distanceSource === "google" ? "Distance calculated automatically" : "Manual distance"}</small>
                      </div>
                    )}
                    <FareLines label={isRoundTrip ? "Outbound trip" : undefined} distanceKm={quote.distanceKm} breakdown={quote.breakdown} />
                    {isRoundTrip && returnQuote?.breakdown && (
                      <FareLines label="Return trip · 10% off" distanceKm={returnQuote.distanceKm} breakdown={returnQuote.breakdown} />
                    )}
                    <div className={styles.estimatedTotal}>
                      <span>Estimated total<small>Final fare confirmed by dispatch</small></span>
                      <strong>${combinedTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                )}

                {error && <p className={styles.error}>{error}</p>}
                <button type="submit" disabled={submitting} className={styles.submitButton}>
                  {submitting ? "Sending your request..." : "Request this booking"}
                </button>
                <p className={styles.consent}>Submitting this form requests non-emergency transportation. A dispatcher will contact you to confirm availability and final pricing. For a medical emergency, call 911.</p>
              </div>
            </div>

            <div className={styles.policyCard}>
              <h3>Important fare notes</h3>
              <ul>
                <li><span>$50</span> weekend, night or holiday charge</li>
                <li><span>$10</span> oxygen per trip</li>
                <li><span>3 hrs</span> cancellation notice required</li>
                <li><span>$120</span> late cancellation / no-show fee</li>
              </ul>
              <p>Visa, credit card, direct deposit and cash are accepted.</p>
            </div>
          </aside>
        </form>

        <section className={styles.rateGuide}>
          <div><p className={styles.eyebrow}>2026 pricing at a glance</p><h2>Clear rates, before you ride.</h2></div>
          <div className={styles.rateTiles}>
            <RateTile title="Wheelchair · London" base="$50 base" rate="$2.20/km" />
            <RateTile title="Wheelchair · Out of city" base="$60 base" rate="$2.20/km · $2 after 100 km" />
            <RateTile title="Stretcher" base="$120 base" rate="$3.20/km · $3 after 100 km" />
            <RateTile title="Bariatric support" base="+$100" rate="$3.50/km" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SectionHeader({ number, title, copy }: { number: string; title: string; copy: string }) {
  return (
    <header className={styles.sectionHeader}>
      <span>{number}</span>
      <div><h2>{title}</h2><p>{copy}</p></div>
    </header>
  );
}

function FareLines({ label, distanceKm, breakdown }: { label?: string; distanceKm: number | null; breakdown: Breakdown }) {
  return (
    <div className={styles.fareLeg}>
      {label && <p className={styles.fareLegLabel}>{label}</p>}
      <Row label="Base fare" value={breakdown.baseFare} />
      <Row label={`Distance (${distanceKm ?? "—"} km)`} value={breakdown.distanceCost} />
      {breakdown.bariatricCharge > 0 && <Row label="Bariatric support" value={breakdown.bariatricCharge} />}
      {breakdown.waitCost > 0 && <Row label="Waiting time" value={breakdown.waitCost} />}
      {breakdown.oxygenCharge > 0 && <Row label="Oxygen" value={breakdown.oxygenCharge} />}
      {breakdown.attendantCharge > 0 && <Row label="Extra attendant" value={breakdown.attendantCharge} />}
      {breakdown.weekendNightHolidayCharge > 0 && <Row label="Weekend / night / holiday" value={breakdown.weekendNightHolidayCharge} />}
      {breakdown.roundTripDiscount > 0 && <Row label="Return-trip saving" value={-breakdown.roundTripDiscount} discount />}
      {breakdown.tax > 0 && <Row label="Tax" value={breakdown.tax} />}
      <div className={styles.legTotal}><span>Trip total</span><strong>${breakdown.total.toFixed(2)}</strong></div>
    </div>
  );
}

function Row({ label, value, discount = false }: { label: string; value: number; discount?: boolean }) {
  return <div className={`${styles.fareRow} ${discount ? styles.discountRow : ""}`}><span>{label}</span><strong>{value < 0 ? "−" : ""}${Math.abs(value).toFixed(2)}</strong></div>;
}

function RateTile({ title, base, rate }: { title: string; base: string; rate: string }) {
  return <div><p>{title}</p><strong>{base}</strong><span>{rate}</span></div>;
}

function LoadingFare() {
  return <div className={styles.loadingFare}><span /><span /><span /><p>Calculating the best estimate…</p></div>;
}

function CheckIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 10 3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function FareIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" stroke="currentColor" strokeWidth="1.6"/><path d="m8.5 12 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function OptionIcon({ type }: { type: "care" | "oxygen" | "person" }) {
  const paths = {
    care: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" stroke="currentColor" strokeWidth="1.6" />,
    oxygen: <><circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6"/><path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
    person: <><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M6.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
  };
  return <span className={styles.optionIcon}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{paths[type]}</svg></span>;
}
