"use client";

import { useMemo, useState } from "react";
import styles from "./LongDateInput.module.css";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type DateParts = { day: string; month: string; year: string; time: string };

type LongDateInputProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  includeTime?: boolean;
  min?: string;
  max?: string;
  ariaLabel: string;
  controlClassName?: string;
  className?: string;
  yearsBack?: number;
  yearsForward?: number;
};

function parseValue(value: string | undefined): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value ?? "");
  return match
    ? { year: match[1], month: match[2], day: match[3], time: match[4] ? `${match[4]}:${match[5]}` : "" }
    : { day: "", month: "", year: "", time: "" };
}

function composeValue(parts: DateParts, includeTime: boolean): string {
  if (!parts.day || !parts.month || !parts.year || (includeTime && !parts.time)) return "";
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return includeTime ? `${date}T${parts.time}` : date;
}

export default function LongDateInput({
  value,
  defaultValue,
  onChange,
  name,
  required = false,
  includeTime = false,
  min,
  max,
  ariaLabel,
  controlClassName = "",
  className = "",
  yearsBack = 1,
  yearsForward = 5,
}: LongDateInputProps) {
  const [parts, setParts] = useState<DateParts>(() => parseValue(value ?? defaultValue));

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const firstYear = min ? Number(min.slice(0, 4)) : currentYear - yearsBack;
    const lastYear = max ? Number(max.slice(0, 4)) : currentYear + yearsForward;
    return Array.from({ length: Math.max(1, lastYear - firstYear + 1) }, (_, index) => firstYear + index);
  }, [max, min, yearsBack, yearsForward]);

  const dayCount = parts.month && parts.year
    ? new Date(Number(parts.year), Number(parts.month), 0).getDate()
    : 31;
  const composedValue = composeValue(parts, includeTime);
  const classes = `${styles.control} ${controlClassName}`.trim();

  function update(next: Partial<DateParts>) {
    const updated = { ...parts, ...next };
    if (updated.day && Number(updated.day) > new Date(Number(updated.year || 2000), Number(updated.month || 1), 0).getDate()) {
      updated.day = "";
    }
    setParts(updated);
    onChange?.(composeValue(updated, includeTime));
  }

  return (
    <div className={`${styles.dateInput} ${includeTime ? styles.dateTimeInput : ""} ${className}`.trim()}>
      <select className={classes} aria-label={`${ariaLabel}: day`} value={parts.day} onChange={(event) => update({ day: event.target.value })} required={required}>
        <option value="">Day</option>
        {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => (
          <option key={day} value={String(day).padStart(2, "0")}>{day}</option>
        ))}
      </select>
      <select className={classes} aria-label={`${ariaLabel}: month`} value={parts.month} onChange={(event) => update({ month: event.target.value })} required={required}>
        <option value="">Month</option>
        {MONTHS.map((month, index) => (
          <option key={month} value={String(index + 1).padStart(2, "0")}>{month}</option>
        ))}
      </select>
      <select className={classes} aria-label={`${ariaLabel}: year`} value={parts.year} onChange={(event) => update({ year: event.target.value })} required={required}>
        <option value="">Year</option>
        {years.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
      {includeTime && (
        <input
          type="time"
          className={`${classes} ${styles.timeControl}`.trim()}
          aria-label={`${ariaLabel}: time`}
          value={parts.time}
          onChange={(event) => update({ time: event.target.value })}
          required={required}
        />
      )}
      {name && <input type="hidden" name={name} value={composedValue} />}
    </div>
  );
}
