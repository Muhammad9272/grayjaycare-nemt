"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import AddressAutocomplete, { type ResolvedPlace } from "@/components/AddressAutocomplete";
import LongDateInput from "@/components/LongDateInput";
import { serviceDateTimeInputValue, torontoLocalDateTimeToIso } from "@/lib/dates";
import styles from "./booking.module.css";
import TidioChat from "@/components/TidioChat";

type MobilityType = "AMBULATORY" | "WHEELCHAIR" | "STRETCHER";
type PickupTimePreference = "SPECIFIC" | "ASAP" | "FLEXIBLE";
type ReturnTripType = "ONE_WAY" | "SCHEDULED_RETURN" | "WAIT_AND_RETURN";
type PaymentPreference = "CARD" | "E_TRANSFER" | "INVOICE" | "DIRECT_BILLING" | "INSURANCE" | "OPGT" | "OTHER";
type RequirementAnswer = "NO" | "YES" | "NOT_SURE";
type WeightUnit = "LB" | "KG";
type SpecialAssistance = "NO" | "STAIR_CHAIR" | "BARIATRIC" | "NOT_SURE";
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

const SERVICE_OPTIONS: { value: MobilityType; title: string; copy: string }[] = [
  { value: "AMBULATORY", title: "Ambulatory", copy: "Passenger who can walk independently or with limited assistance" },
  { value: "WHEELCHAIR", title: "Wheelchair", copy: "Wheelchair transportation with securement support" },
  { value: "STRETCHER", title: "Stretcher", copy: "Non-emergency stretcher transportation with trained attendants" },
];

function addMinutesToLocalDateTime(value: string, minutes: number) {
  if (!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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
  const [pickupFacilityName, setPickupFacilityName] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffPlace, setDropoffPlace] = useState<ResolvedPlace | null>(null);
  const [dropoffDepartment, setDropoffDepartment] = useState("");
  const [dropoffRoom, setDropoffRoom] = useState("");
  const [dropoffFacilityName, setDropoffFacilityName] = useState("");
  const [manualDistanceKm, setManualDistanceKm] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [pickupTimePreference, setPickupTimePreference] = useState<PickupTimePreference>("SPECIFIC");
  const [mobilityType, setMobilityType] = useState<MobilityType>("AMBULATORY");
  const [isOutOfCity, setIsOutOfCity] = useState(false);
  const [patientOver250, setPatientOver250] = useState<RequirementAnswer>("NOT_SURE");
  const [passengerWeight, setPassengerWeight] = useState("");
  const [passengerWeightUnit, setPassengerWeightUnit] = useState<WeightUnit>("LB");
  const [specialAssistance, setSpecialAssistance] = useState<SpecialAssistance>("NO");
  const [stairChairWeightEligible, setStairChairWeightEligible] = useState<RequirementAnswer>("NOT_SURE");
  const [oxygenRequirement, setOxygenRequirement] = useState<RequirementAnswer>("NO");
  const [oxygenLitresPerMinute, setOxygenLitresPerMinute] = useState("");
  const [isolationRequirement, setIsolationRequirement] = useState<RequirementAnswer>("NO");
  const [isolationDetails, setIsolationDetails] = useState("");
  const [dnrRequirement, setDnrRequirement] = useState<RequirementAnswer>("NO");
  const [dnrDocumentationConfirmed, setDnrDocumentationConfirmed] = useState(false);
  const [belongingsRequirement, setBelongingsRequirement] = useState<RequirementAnswer>("NO");
  const [belongingsDescription, setBelongingsDescription] = useState("");
  const [escortCount, setEscortCount] = useState("0");
  const [accompanimentChoice, setAccompanimentChoice] = useState("0");
  const [extraAttendant, setExtraAttendant] = useState(false);
  const [extraAttendantHours, setExtraAttendantHours] = useState("1");
  const [waitHours, setWaitHours] = useState("1");
  const [waitMinuteRemainder, setWaitMinuteRemainder] = useState("0");
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
  const [invoiceRecipient, setInvoiceRecipient] = useState("");
  const [invoiceName, setInvoiceName] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingOrganization, setBillingOrganization] = useState("");
  const [billingAccountNumber, setBillingAccountNumber] = useState("");
  const [billingContactPerson, setBillingContactPerson] = useState("");
  const [purchaseOrderReference, setPurchaseOrderReference] = useState("");
  const [insuranceCompany, setInsuranceCompany] = useState("");
  const [insuranceClaimNumber, setInsuranceClaimNumber] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [opgtClientInformation, setOpgtClientInformation] = useState("");
  const [opgtContactPerson, setOpgtContactPerson] = useState("");
  const [otherPaymentDetails, setOtherPaymentDetails] = useState("");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [returnQuote, setReturnQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    referenceCode: string;
    emailSent: boolean;
  } | null>(null);
  const [minimumPickupTime] = useState(() => serviceDateTimeInputValue(new Date(Date.now() + 5 * 60_000)));
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const readyForQuote = useMemo(
    () => pickupAddress.length > 3 && dropoffAddress.length > 3 && scheduledAt.length > 0,
    [pickupAddress, dropoffAddress, scheduledAt],
  );
  const hasReturnLeg = returnTripType === "SCHEDULED_RETURN" || returnTripType === "WAIT_AND_RETURN";
  const isRoundTrip = returnTripType !== "ONE_WAY";
  const waitMinutes = returnTripType === "WAIT_AND_RETURN"
    ? String(Number(waitHours) * 60 + Number(waitMinuteRemainder))
    : "0";
  const effectiveReturnScheduledAt = returnTripType === "WAIT_AND_RETURN"
    ? addMinutesToLocalDateTime(scheduledAt, Number(waitMinutes))
    : returnScheduledAt;
  const isBariatric = specialAssistance === "BARIATRIC";
  const readyForReturnQuote = hasReturnLeg && readyForQuote && effectiveReturnScheduledAt.length > 0;

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
    requiresOxygen: oxygenRequirement === "YES",
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
    oxygenRequirement,
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
            waitMinutes: 0,
            scheduledAt: torontoLocalDateTimeToIso(effectiveReturnScheduledAt),
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
    oxygenRequirement,
    extraAttendant,
    extraAttendantHours,
    effectiveReturnScheduledAt,
  ]);

  const combinedTotal =
    (quote?.breakdown?.total ?? 0) + (hasReturnLeg ? (returnQuote?.breakdown?.total ?? 0) : 0);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const distanceKm = manualDistanceKm ? Number(manualDistanceKm) : quote?.distanceKm;
    if (!distanceKm && bookingChannel !== "PUBLIC") {
      setError("We couldn't determine the trip distance. Please enter an estimated distance in kilometres.");
      return;
    }
    if (returnTripType === "SCHEDULED_RETURN" && !effectiveReturnScheduledAt) {
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
          pickupFacilityName: pickupFacilityName || undefined,
          pickupDepartment: pickupDepartment || undefined,
          pickupRoom: pickupRoom || undefined,
          dropoffDepartment: dropoffDepartment || undefined,
          dropoffFacilityName: dropoffFacilityName || undefined,
          dropoffRoom: dropoffRoom || undefined,
          pickupTimePreference,
          returnTripType,
          escortCount: Number(escortCount),
          patientOver250,
          passengerWeightValue: passengerWeight && (patientOver250 === "YES" || specialAssistance === "BARIATRIC") ? Number(passengerWeight) : undefined,
          passengerWeightUnit: passengerWeight && (patientOver250 === "YES" || specialAssistance === "BARIATRIC") ? passengerWeightUnit : undefined,
          specialAssistance,
          stairChairWeightEligible: specialAssistance === "STAIR_CHAIR" ? stairChairWeightEligible : undefined,
          oxygenRequirement,
          oxygenLitresPerMinute: oxygenRequirement === "YES" ? Number(oxygenLitresPerMinute) : undefined,
          isolationRequirement,
          isolationDetails: isolationRequirement === "YES" ? isolationDetails : undefined,
          dnrRequirement,
          dnrDocumentationConfirmed,
          belongingsRequirement,
          belongingsDescription: belongingsRequirement === "YES" ? belongingsDescription : undefined,
          paymentPreference: paymentPreference || undefined,
          invoiceRecipient: paymentPreference === "INVOICE" ? invoiceRecipient || undefined : undefined,
          invoiceName: paymentPreference === "INVOICE" ? invoiceName || undefined : undefined,
          invoiceEmail: paymentPreference === "INVOICE" ? invoiceEmail || undefined : undefined,
          billingAddress: paymentPreference === "INVOICE" ? billingAddress || undefined : undefined,
          billingOrganization: paymentPreference === "DIRECT_BILLING" ? billingOrganization || undefined : undefined,
          billingAccountNumber: paymentPreference === "DIRECT_BILLING" ? billingAccountNumber || undefined : undefined,
          billingContactPerson: paymentPreference === "DIRECT_BILLING" ? billingContactPerson || undefined : undefined,
          purchaseOrderReference: paymentPreference === "INVOICE" || paymentPreference === "DIRECT_BILLING" ? purchaseOrderReference || undefined : undefined,
          insuranceCompany: paymentPreference === "INSURANCE" ? insuranceCompany || undefined : undefined,
          insuranceClaimNumber: paymentPreference === "INSURANCE" ? insuranceClaimNumber || undefined : undefined,
          insurancePolicyNumber: paymentPreference === "INSURANCE" ? insurancePolicyNumber || undefined : undefined,
          opgtClientInformation: paymentPreference === "OPGT" ? opgtClientInformation || undefined : undefined,
          opgtContactPerson: paymentPreference === "OPGT" ? opgtContactPerson || undefined : undefined,
          otherPaymentDetails: paymentPreference === "OTHER" ? otherPaymentDetails || undefined : undefined,
          notes: notes || undefined,
          isRoundTrip,
          returnScheduledAt: returnTripType === "SCHEDULED_RETURN" ? torontoLocalDateTimeToIso(effectiveReturnScheduledAt) : undefined,
          returnDistanceKm: hasReturnLeg && distanceKm ? distanceKm : undefined,
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
              <span><small>Next step</small><strong>Dispatcher confirmation</strong></span>
            </div>
            <div className={styles.confirmationActions}>
              <Link href="/" className={styles.secondaryButton}>Back to home</Link>
              <a href="tel:+15199335090" className={styles.primaryButton}>Call (519) 933-5090</a>
            </div>
          </div>
        </main>
        <Footer />
        <TidioChat />
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
              Tell us what the passenger needs. Our dispatcher will review the request and contact you to confirm the ride.
            </p>
            <div className={styles.trustRow}>
              <span><CheckIcon /> No account setup required</span>
              <span><CheckIcon /> Simple request process</span>
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
              <SectionHeader number="01" title="Contact information" copy="Who should our dispatcher contact to confirm this booking?" />
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
                  <small>We&apos;ll send the booking confirmation and reference number to this contact.</small>
                </label>
              </div>
            </section>

            <section className={styles.sectionCard}>
              <SectionHeader number="02" title="Patient information" copy="Tell us who will be travelling and what assistance they may require." />
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Patient&apos;s full name</span>
                  <input className={styles.input} value={patientName} onChange={(event) => setPatientName(event.target.value)} required />
                </label>
                <label className={styles.field}>
                  <span>Medical Record Number (MRN) — optional</span>
                  <input className={styles.input} value={medicalRecordNumber} onChange={(event) => setMedicalRecordNumber(event.target.value)} autoComplete="off" />
                  <small>For hospital and facility bookings only.</small>
                </label>
                <label className={styles.field}>
                  <span>Does the patient weigh more than 250 lb (113 kg)?</span>
                  <select className={styles.input} value={patientOver250} onChange={(event) => setPatientOver250(event.target.value as RequirementAnswer)}>
                    <option value="NO">No</option><option value="YES">Yes</option><option value="NOT_SURE">Not sure</option>
                  </select>
                </label>
                {patientOver250 === "YES" && <WeightInput value={passengerWeight} unit={passengerWeightUnit} onValue={setPassengerWeight} onUnit={setPassengerWeightUnit} styles={styles} />}
                <label className={styles.field}>
                  <span>Will anyone be accompanying the patient?</span>
                  <select className={styles.input} value={accompanimentChoice} onChange={(event) => { const choice = event.target.value; setAccompanimentChoice(choice); setEscortCount(choice === "3_PLUS" ? "3" : choice); }}>
                    <option value="0">No</option><option value="1">Yes — 1 person</option><option value="2">Yes — 2 people</option><option value="3_PLUS">Yes — 3 or more people</option>
                  </select>
                </label>
                {accompanimentChoice === "3_PLUS" && <label className={styles.field}><span>How many people will be accompanying the patient?</span><input type="number" min="3" max="10" className={styles.input} value={escortCount} onChange={(event) => setEscortCount(event.target.value)} required /></label>}
              </div>
            </section>

            <section className={styles.sectionCard}>
              <SectionHeader number="03" title="Trip details" copy="Where and when should we pick up the patient?" />
              <div className={styles.formGrid}>
                <label className={`${styles.field} ${styles.fullField}`}><span>Pickup address</span><AddressAutocomplete inputClassName={styles.input} value={pickupAddress} onChange={setPickupAddress} onPlaceResolved={setPickupPlace} placeholder="123 Main St, London, ON" required /></label>
                <label className={styles.field}><span>Pickup facility / hospital name <small>(optional)</small></span><input className={styles.input} value={pickupFacilityName} onChange={(event) => setPickupFacilityName(event.target.value)} /></label>
                <label className={styles.field}><span>Pickup department / unit <small>(optional)</small></span><input className={styles.input} value={pickupDepartment} onChange={(event) => setPickupDepartment(event.target.value)} placeholder="e.g. Endoscopy Unit" /></label>
                <label className={styles.field}><span>Pickup room <small>(optional)</small></span><input className={styles.input} value={pickupRoom} onChange={(event) => setPickupRoom(event.target.value)} placeholder="e.g. Room 200" /></label>
                <label className={`${styles.field} ${styles.fullField}`}><span>Drop-off address</span><AddressAutocomplete inputClassName={styles.input} value={dropoffAddress} onChange={setDropoffAddress} onPlaceResolved={setDropoffPlace} placeholder="Hospital, clinic or home address" required /></label>
                <label className={styles.field}><span>Drop-off facility / hospital name <small>(optional)</small></span><input className={styles.input} value={dropoffFacilityName} onChange={(event) => setDropoffFacilityName(event.target.value)} /></label>
                <label className={styles.field}><span>Drop-off department / unit <small>(optional)</small></span><input className={styles.input} value={dropoffDepartment} onChange={(event) => setDropoffDepartment(event.target.value)} placeholder="e.g. Imaging" /></label>
                <label className={styles.field}><span>Drop-off room <small>(optional)</small></span><input className={styles.input} value={dropoffRoom} onChange={(event) => setDropoffRoom(event.target.value)} placeholder="e.g. Room 310" /></label>
                <div className={`${styles.field} ${styles.fullField}`}><span>Pickup date and time</span><LongDateInput includeTime min={minimumPickupTime} ariaLabel="Pickup date and time" controlClassName={styles.input} value={scheduledAt} onChange={setScheduledAt} required /></div>
                <div className={`${styles.roundTripBox} ${styles.fullField}`}>
                  <label className={styles.field}><span>One-way or return trip?</span><select className={styles.input} value={returnTripType} onChange={(event) => setReturnTripType(event.target.value as ReturnTripType)}><option value="ONE_WAY">One-way trip</option><option value="WAIT_AND_RETURN">Wait with the patient and return</option><option value="SCHEDULED_RETURN">Drop off and return later</option></select></label>
                  {returnTripType === "SCHEDULED_RETURN" && <div className={styles.field}><span>Estimated return pickup date and time</span><LongDateInput includeTime min={scheduledAt || minimumPickupTime} ariaLabel="Return pickup date and time" controlClassName={styles.input} value={returnScheduledAt} onChange={setReturnScheduledAt} required /></div>}
                  {returnTripType === "WAIT_AND_RETURN" && <div className={`${styles.field} ${styles.fullField}`}><span>What is the approximate waiting time before returning with the patient?</span><div className={styles.formGrid}><label className={styles.field}><span>Hours</span><select className={styles.input} value={waitHours} onChange={(event) => setWaitHours(event.target.value)}>{Array.from({ length: 13 }, (_, hour) => <option key={hour} value={hour}>{hour}</option>)}</select></label><label className={styles.field}><span>Minutes</span><select className={styles.input} value={waitMinuteRemainder} onChange={(event) => setWaitMinuteRemainder(event.target.value)}>{[0, 15, 30, 45].map((minute) => <option key={minute} value={minute}>{String(minute).padStart(2, "0")}</option>)}</select></label></div><small>Waiting time charges may apply based on the actual waiting time.</small></div>}
                </div>
                {bookingChannel !== "PUBLIC" && <>
                  <label className={styles.field}><span>Preferred timing</span><select className={styles.input} value={pickupTimePreference} onChange={(event) => setPickupTimePreference(event.target.value as PickupTimePreference)}><option value="SPECIFIC">Specific time</option><option value="ASAP">First available (ASAP)</option><option value="FLEXIBLE">Any time that day</option></select></label>
                  <label className={styles.field}><span>Service area</span><select className={styles.input} value={isOutOfCity ? "out" : "in"} onChange={(event) => setIsOutOfCity(event.target.value === "out")}><option value="in">Within London</option><option value="out">Outside London</option></select></label>
                </>}
                {bookingChannel !== "PUBLIC" && readyForQuote && quote && quote.distanceKm == null && <label className={`${styles.field} ${styles.fullField}`}><span>Estimated trip distance (km)</span><input type="number" min="0.1" step="0.1" className={styles.input} value={manualDistanceKm} onChange={(event) => setManualDistanceKm(event.target.value)} required /></label>}
              </div>
            </section>

            <section className={styles.sectionCard}>
              <SectionHeader number="04" title="Transportation type" copy="Choose the vehicle and assistance best suited to the passenger." />
              <fieldset className={styles.field}><legend>Transportation type</legend><div className={styles.serviceGrid}>{SERVICE_OPTIONS.map((option) => <label key={option.value} className={`${styles.serviceChoice} ${mobilityType === option.value ? styles.choiceActive : ""}`}><input type="radio" name="mobilityType" value={option.value} checked={mobilityType === option.value} onChange={() => { setMobilityType(option.value); if (option.value === "AMBULATORY" && specialAssistance === "BARIATRIC") setSpecialAssistance("NO"); }} /><span className={styles.radioMark} /><strong>{option.title}</strong><small>{option.copy}</small></label>)}</div></fieldset>
              {bookingChannel !== "PUBLIC" && <label className={`${styles.optionCard} ${extraAttendant ? styles.optionActive : ""}`}><input type="checkbox" checked={extraAttendant} onChange={(event) => setExtraAttendant(event.target.checked)} /><OptionIcon type="person" /><span><strong>Extra attendant</strong><small>Internal dispatch option</small></span></label>}
            </section>

            <section className={styles.sectionCard}>
              <SectionHeader number="05" title="Passenger requirements" copy="These answers help the care team prepare safely." />
              <div className={styles.formGrid}>
                <label className={styles.field}><span>Does the patient require special assistance?</span><select className={styles.input} value={specialAssistance} onChange={(event) => setSpecialAssistance(event.target.value as SpecialAssistance)}><option value="NO">No</option><option value="STAIR_CHAIR">Yes — Stair-chair assistance</option><option value="BARIATRIC" disabled={mobilityType === "AMBULATORY"}>Yes — Bariatric support</option><option value="NOT_SURE">Not sure</option></select>{mobilityType === "AMBULATORY" && <small>Bariatric support is available for wheelchair and stretcher transportation.</small>}</label>
                {specialAssistance === "STAIR_CHAIR" && <div className={styles.field}><RequirementSelect label="Does the patient weigh 250 lb (113 kg) or less?" value={stairChairWeightEligible} onChange={setStairChairWeightEligible} styles={styles} /><small>Stair-chair assistance is available for patients up to 250 lb (113 kg), subject to safe operating conditions.</small></div>}
                {specialAssistance === "BARIATRIC" && <div className={styles.field}>{patientOver250 !== "YES" && <WeightInput value={passengerWeight} unit={passengerWeightUnit} onValue={setPassengerWeight} onUnit={setPassengerWeightUnit} styles={styles} />}<small>Bariatric support is available for wheelchair and stretcher transportation.</small></div>}
                <RequirementSelect label="Does the patient require oxygen during transportation?" value={oxygenRequirement} onChange={setOxygenRequirement} styles={styles} />
                {oxygenRequirement === "YES" && <label className={styles.field}><span>What is the required oxygen flow rate?</span><span className={styles.inputWithSuffix}><input type="number" min="0.1" max="5" step="0.1" className={styles.input} value={oxygenLitresPerMinute} onChange={(event) => setOxygenLitresPerMinute(event.target.value)} required /><b>L/min</b></span><small>Gray Jay Care provides oxygen transportation support for flow rates up to a maximum of 5 L/min. Please provide the patient&apos;s prescribed flow rate when booking.</small></label>}
                <RequirementSelect label="Are isolation precautions required?" value={isolationRequirement} onChange={setIsolationRequirement} styles={styles} />
                {isolationRequirement === "YES" && <label className={styles.field}><span>Isolation type / precautions</span><input className={styles.input} value={isolationDetails} onChange={(event) => setIsolationDetails(event.target.value)} placeholder="e.g. contact, droplet, flu, COVID-19" required /></label>}
                <RequirementSelect label="Does the patient have a DNR (Do Not Resuscitate) paperwork?" value={dnrRequirement} onChange={setDnrRequirement} styles={styles} />
                {dnrRequirement === "YES" && <label className={`${styles.optionCard} ${styles.fullField} ${dnrDocumentationConfirmed ? styles.optionActive : ""}`}><input type="checkbox" checked={dnrDocumentationConfirmed} onChange={(event) => setDnrDocumentationConfirmed(event.target.checked)} required /><OptionIcon type="care" /><span><strong>Please confirm that the required DNR documentation will be available at pickup.</strong></span></label>}
              </div>
            </section>

            <section className={styles.sectionCard}>
              <SectionHeader number="06" title="Payment information" copy="How will this transportation be paid for?" />
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Payment method</span>
                  <select className={styles.input} value={paymentPreference} onChange={(event) => setPaymentPreference(event.target.value as PaymentPreference)} required>
                    <option value="">Select payment preference</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="E_TRANSFER">E-transfer</option>
                    <option value="INVOICE">Invoice</option>
                    <option value="DIRECT_BILLING">Direct Billing / Account</option>
                    <option value="INSURANCE">Insurance</option>
                    <option value="OPGT">OPGT</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
                {(paymentPreference === "CARD" || paymentPreference === "E_TRANSFER") && <p className={`${styles.fullField} ${styles.consent}`}>Payment instructions will be provided by Gray Jay Care.</p>}
                {paymentPreference === "INVOICE" && <>
                  <label className={styles.field}><span>Who should receive the invoice?</span><select className={styles.input} value={invoiceRecipient} onChange={(event) => setInvoiceRecipient(event.target.value)} required><option value="">Select recipient</option><option value="PATIENT_CLIENT">Patient / Client</option><option value="HOSPITAL_FACILITY">Hospital / Facility</option><option value="OTHER">Other</option></select></label>
                  <label className={styles.field}><span>Invoice To — Full Name / Organization</span><input className={styles.input} value={invoiceName} onChange={(event) => setInvoiceName(event.target.value)} required /></label>
                  <label className={styles.field}><span>Email Address</span><input type="email" className={styles.input} value={invoiceEmail} onChange={(event) => setInvoiceEmail(event.target.value)} required /></label>
                  <label className={styles.field}><span>Billing Address</span><input className={styles.input} value={billingAddress} onChange={(event) => setBillingAddress(event.target.value)} required /></label>
                  <label className={styles.field}><span>Purchase Order / Reference Number <small>(if applicable)</small></span><input className={styles.input} value={purchaseOrderReference} onChange={(event) => setPurchaseOrderReference(event.target.value)} /></label>
                </>}
                {paymentPreference === "DIRECT_BILLING" && <>
                  <label className={styles.field}><span>Account / Organization Name</span><input className={styles.input} value={billingOrganization} onChange={(event) => setBillingOrganization(event.target.value)} required /></label>
                  <label className={styles.field}><span>Account Number <small>(if applicable)</small></span><input className={styles.input} value={billingAccountNumber} onChange={(event) => setBillingAccountNumber(event.target.value)} /></label>
                  <label className={styles.field}><span>Contact Person</span><input className={styles.input} value={billingContactPerson} onChange={(event) => setBillingContactPerson(event.target.value)} required /></label>
                  <label className={styles.field}><span>Purchase Order / Reference Number <small>(if applicable)</small></span><input className={styles.input} value={purchaseOrderReference} onChange={(event) => setPurchaseOrderReference(event.target.value)} /></label>
                </>}
                {paymentPreference === "INSURANCE" && <>
                  <label className={styles.field}><span>Insurance Company</span><input className={styles.input} value={insuranceCompany} onChange={(event) => setInsuranceCompany(event.target.value)} required /></label>
                  <label className={styles.field}><span>Claim / Reference Number</span><input className={styles.input} value={insuranceClaimNumber} onChange={(event) => setInsuranceClaimNumber(event.target.value)} required /></label>
                  <label className={styles.field}><span>Policy Number <small>(if required)</small></span><input className={styles.input} value={insurancePolicyNumber} onChange={(event) => setInsurancePolicyNumber(event.target.value)} /></label>
                </>}
                {paymentPreference === "OPGT" && <><label className={styles.field}><span>OPGT Client / Account Information</span><input className={styles.input} value={opgtClientInformation} onChange={(event) => setOpgtClientInformation(event.target.value)} required /></label><label className={styles.field}><span>Contact Person <small>(if applicable)</small></span><input className={styles.input} value={opgtContactPerson} onChange={(event) => setOpgtContactPerson(event.target.value)} /></label></>}
                {paymentPreference === "OTHER" && <label className={`${styles.field} ${styles.fullField}`}><span>Please provide payment details</span><textarea className={styles.input} rows={3} value={otherPaymentDetails} onChange={(event) => setOtherPaymentDetails(event.target.value)} required /><small>Payment arrangements will be reviewed and confirmed by Gray Jay Care before transportation is finalized.</small></label>}
                {extraAttendant && (
                  <label className={styles.field}>
                    <span>Extra attendant time</span>
                    <span className={styles.inputWithSuffix}>
                      <input type="number" min="0.5" step="0.5" className={styles.input} value={extraAttendantHours} onChange={(event) => setExtraAttendantHours(event.target.value)} />
                      <b>hours</b>
                    </span>
                  </label>
                )}
              </div>
            </section>

            <section className={styles.sectionCard}>
              <SectionHeader number="07" title="Belongings and notes" copy="Share anything the transport team should know before arrival." />
              <div className={styles.formGrid}>
                <RequirementSelect label="Will the patient have belongings?" value={belongingsRequirement} onChange={setBelongingsRequirement} styles={styles} />
                {belongingsRequirement === "YES" && <label className={styles.field}><span>Describe the belongings</span><input className={styles.input} value={belongingsDescription} onChange={(event) => setBelongingsDescription(event.target.value)} placeholder="e.g. wheelchair, two bags, walker" required /></label>}
                <label className={`${styles.field} ${styles.fullField}`}>
                  <span>Additional notes <small>(optional)</small></span>
                  <textarea className={styles.input} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Entrance instructions, appointment details, transfer assistance or anything else we should know." />
                </label>
              </div>
            </section>
          </div>

          <aside className={styles.summaryColumn}>
            <div className={styles.fareCard} aria-live="polite">
              <div className={styles.fareHeader}>
                <span><small>{bookingChannel === "PUBLIC" ? "Final step" : "Live estimate"}</small><strong>{bookingChannel === "PUBLIC" ? "Send your request" : "Your trip fare"}</strong></span>
                <b>{bookingChannel === "PUBLIC" ? "24/7" : "2026 rates"}</b>
              </div>
              <div className={styles.fareBody}>
                {bookingChannel === "PUBLIC" ? (
                  <div className={styles.emptyFare}>
                    <CheckIcon />
                    <strong>We&apos;ll take it from here</strong>
                    <p>A dispatcher will review your details, confirm availability, and contact you directly.</p>
                  </div>
                ) : quoteLoading ? <LoadingFare /> : !readyForQuote ? (
                  <div className={styles.emptyFare}>
                    <FareIcon />
                    <strong>Ready when you are</strong>
                    <p>Add the addresses and pickup time to calculate your estimate.</p>
                  </div>
                ) : null}
                {bookingChannel !== "PUBLIC" && !quoteLoading && readyForQuote && quote?.message && (
                  <p className={styles.quoteMessage}>{quote.message}</p>
                )}
                {bookingChannel !== "PUBLIC" && !quoteLoading && quote?.breakdown && (
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

                {error && <p ref={errorRef} role="alert" tabIndex={-1} className={styles.error}>{error}</p>}
                <button type="submit" disabled={submitting} className={styles.submitButton}>
                  {submitting ? "Sending your request..." : "Request this booking"}
                </button>
                <p className={styles.consent}>Submitting this form requests non-emergency transportation. A dispatcher will contact you to confirm {bookingChannel === "PUBLIC" ? "availability and trip details" : "availability and final pricing"}. For a medical emergency, call 911.</p>
              </div>
            </div>

            {bookingChannel !== "PUBLIC" && <div className={styles.policyCard}>
              <h3>Important fare notes</h3>
              <ul>
                <li><span>$50</span> weekend, night or holiday charge</li>
                <li><span>$10</span> oxygen per trip</li>
                <li><span>3 hrs</span> cancellation notice required</li>
                <li><span>$120</span> late cancellation / no-show fee</li>
              </ul>
              <p>Visa, credit card, direct deposit and cash are accepted.</p>
            </div>}
          </aside>
        </form>

        {bookingChannel !== "PUBLIC" && <section className={styles.rateGuide}>
          <div><p className={styles.eyebrow}>2026 pricing at a glance</p><h2>Clear rates, before you ride.</h2></div>
          <div className={styles.rateTiles}>
            <RateTile title="Wheelchair · London" base="$50 base" rate="$2.20/km" />
            <RateTile title="Wheelchair · Out of city" base="$60 base" rate="$2.20/km · $2 after 100 km" />
            <RateTile title="Stretcher" base="$120 base" rate="$3.20/km · $3 after 100 km" />
            <RateTile title="Bariatric support" base="+$100" rate="$3.50/km" />
          </div>
        </section>}
      </main>
      <Footer />
      <TidioChat />
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

function RequirementSelect({ label, value, onChange, styles: fieldStyles }: { label: string; value: RequirementAnswer; onChange: (value: RequirementAnswer) => void; styles: typeof styles }) {
  return (
    <label className={fieldStyles.field}>
      <span>{label}</span>
      <select className={fieldStyles.input} value={value} onChange={(event) => onChange(event.target.value as RequirementAnswer)}>
        <option value="NO">No</option>
        <option value="YES">Yes</option>
        <option value="NOT_SURE">Not sure</option>
      </select>
    </label>
  );
}

function WeightInput({ value, unit, onValue, onUnit, styles: fieldStyles }: { value: string; unit: WeightUnit; onValue: (value: string) => void; onUnit: (unit: WeightUnit) => void; styles: typeof styles }) {
  return (
    <label className={fieldStyles.field}>
      <span>What is the patient&apos;s approximate weight?</span>
      <span className={fieldStyles.inputWithSuffix}>
        <input type="number" min="1" max="2200" step="0.1" className={fieldStyles.input} value={value} onChange={(event) => onValue(event.target.value)} placeholder="Enter weight" required />
        <select aria-label="Weight unit" value={unit} onChange={(event) => onUnit(event.target.value as WeightUnit)}><option value="LB">lb</option><option value="KG">kg</option></select>
      </span>
    </label>
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
