"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15";
const labelClass = "text-sm font-medium text-foreground";

function useLogSubmit() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(url: string, body: unknown, onDone: () => void) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(typeof data?.error === "string" ? data.error : "Please check the form for errors.");
        return;
      }
      onDone();
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, error, submitting };
}

function InspectionForm({ currentOdometer, open, onToggle }: { currentOdometer: number; open: boolean; onToggle: () => void }) {
  const { submit, error, submitting } = useLogSubmit();
  const [passed, setPassed] = useState(true);
  const [notes, setNotes] = useState("");
  const [odometerKm, setOdometerKm] = useState(String(currentOdometer));

  if (!open) {
    return <ToggleButton onClick={onToggle}>Log inspection</ToggleButton>;
  }

  return (
    <FormPanel title="Log inspection" onCancel={onToggle}>
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Result</label>
          <select className={inputClass} value={passed ? "pass" : "fail"} onChange={(e) => setPassed(e.target.value === "pass")}>
            <option value="pass">Passed</option>
            <option value="fail">Failed / issue found</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Odometer (km)</label>
          <input type="number" min={0} className={inputClass} value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Notes (optional)</label>
          <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger-fg">{error}</p>}
        <button
          disabled={submitting}
          onClick={() => submit("/api/driver/inspections", { passed, notes: notes || undefined, odometerKm: Number(odometerKm) }, onToggle)}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save inspection"}
        </button>
      </div>
    </FormPanel>
  );
}

function MileageForm({ currentOdometer, open, onToggle }: { currentOdometer: number; open: boolean; onToggle: () => void }) {
  const { submit, error, submitting } = useLogSubmit();
  const [startKm, setStartKm] = useState(String(currentOdometer));
  const [endKm, setEndKm] = useState("");

  if (!open) {
    return <ToggleButton onClick={onToggle}>Log mileage</ToggleButton>;
  }

  return (
    <FormPanel title="Log mileage" onCancel={onToggle}>
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Start odometer (km)</label>
          <input type="number" min={0} className={inputClass} value={startKm} onChange={(e) => setStartKm(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>End odometer (km)</label>
          <input type="number" min={0} className={inputClass} value={endKm} onChange={(e) => setEndKm(e.target.value)} />
        </div>
        {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger-fg">{error}</p>}
        <button
          disabled={submitting || !endKm}
          onClick={() => submit("/api/driver/mileage", { startKm: Number(startKm), endKm: Number(endKm) }, onToggle)}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save mileage"}
        </button>
      </div>
    </FormPanel>
  );
}

function FuelForm({ currentOdometer, open, onToggle }: { currentOdometer: number; open: boolean; onToggle: () => void }) {
  const { submit, error, submitting } = useLogSubmit();
  const [litres, setLitres] = useState("");
  const [cost, setCost] = useState("");
  const [odometerKm, setOdometerKm] = useState(String(currentOdometer));

  if (!open) {
    return <ToggleButton onClick={onToggle}>Log fuel</ToggleButton>;
  }

  return (
    <FormPanel title="Log fuel" onCancel={onToggle}>
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Litres</label>
          <input type="number" min={0} step="0.01" className={inputClass} value={litres} onChange={(e) => setLitres(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Cost ($)</label>
          <input type="number" min={0} step="0.01" className={inputClass} value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Odometer (km)</label>
          <input type="number" min={0} className={inputClass} value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} />
        </div>
        {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger-fg">{error}</p>}
        <button
          disabled={submitting || !litres || !cost}
          onClick={() =>
            submit("/api/driver/fuel", { litres: Number(litres), cost: Number(cost), odometerKm: Number(odometerKm) }, onToggle)
          }
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save fuel log"}
        </button>
      </div>
    </FormPanel>
  );
}

function ToggleButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:border-primary"
    >
      {children}
    </button>
  );
}

function FormPanel({ title, onCancel, children }: { title: string; onCancel: () => void; children: React.ReactNode }) {
  return (
    <div className="w-full rounded-xl border border-border bg-card p-5 shadow-sm sm:w-80">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function VehicleLogForms({ currentOdometer }: { currentOdometer: number }) {
  const [openPanel, setOpenPanel] = useState<"inspection" | "mileage" | "fuel" | null>(null);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <InspectionForm
        currentOdometer={currentOdometer}
        open={openPanel === "inspection"}
        onToggle={() => setOpenPanel((p) => (p === "inspection" ? null : "inspection"))}
      />
      <MileageForm
        currentOdometer={currentOdometer}
        open={openPanel === "mileage"}
        onToggle={() => setOpenPanel((p) => (p === "mileage" ? null : "mileage"))}
      />
      <FuelForm
        currentOdometer={currentOdometer}
        open={openPanel === "fuel"}
        onToggle={() => setOpenPanel((p) => (p === "fuel" ? null : "fuel"))}
      />
    </div>
  );
}
