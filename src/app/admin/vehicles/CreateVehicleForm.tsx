"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15";
const labelClass = "text-sm font-medium text-foreground";

type VehicleType = "SEDAN" | "MINIVAN" | "WHEELCHAIR_VAN" | "STRETCHER_VAN";

export default function CreateVehicleForm() {
  const router = useRouter();
  const [plateNumber, setPlateNumber] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [type, setType] = useState<VehicleType>("SEDAN");
  const [capacity, setCapacity] = useState("4");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plateNumber, make, model, year: Number(year), type, capacity: Number(capacity) }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(typeof data?.error === "string" ? data.error : "Please check the form for errors.");
        return;
      }
      setPlateNumber("");
      setMake("");
      setModel("");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 ">
      <div>
        <label className={labelClass}>Plate number</label>
        <input className={inputClass} value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} required />
      </div>
      <div>
        <label className={labelClass}>Type</label>
        <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as VehicleType)}>
          <option value="SEDAN">Sedan</option>
          <option value="MINIVAN">Minivan</option>
          <option value="WHEELCHAIR_VAN">Wheelchair van</option>
          <option value="STRETCHER_VAN">Stretcher van</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Make</label>
        <input className={inputClass} value={make} onChange={(e) => setMake(e.target.value)} required />
      </div>
      <div>
        <label className={labelClass}>Model</label>
        <input className={inputClass} value={model} onChange={(e) => setModel(e.target.value)} required />
      </div>
      <div>
        <label className={labelClass}>Year</label>
        <input type="number" className={inputClass} value={year} onChange={(e) => setYear(e.target.value)} required />
      </div>
      <div>
        <label className={labelClass}>Passenger capacity</label>
        <input type="number" min={1} className={inputClass} value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
      </div>
      {error && (
        <p className="sm:col-span-2 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger-fg">{error}</p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add vehicle"}
        </button>
      </div>
    </form>
  );
}
