"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./AddressAutocomplete.module.css";

type Suggestion = {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
};

export type ResolvedPlace = {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceResolved,
  inputClassName = "",
  placeholder,
  required = false,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  onPlaceResolved?: (place: ResolvedPlace | null) => void;
  inputClassName?: string;
  placeholder?: string;
  required?: boolean;
  name?: string;
}) {
  const listId = useId();
  const sessionToken = useRef(crypto.randomUUID());
  const suppressSearch = useRef(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (suppressSearch.current) {
      suppressSearch.current = false;
      return;
    }
    if (value.trim().length < 3) return;

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/maps/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: value, sessionToken: sessionToken.current }),
          signal: controller.signal,
        });
        const data = await response.json();
        const nextSuggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
        setSuggestions(nextSuggestions);
        setActiveIndex(-1);
        setOpen(nextSuggestions.length > 0);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [value]);

  async function selectSuggestion(suggestion: Suggestion) {
    suppressSearch.current = true;
    onChange(suggestion.text);
    setOpen(false);
    setSuggestions([]);

    try {
      const response = await fetch("/api/maps/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: suggestion.placeId, sessionToken: sessionToken.current }),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data?.place?.formattedAddress) {
        suppressSearch.current = true;
        onChange(data.place.formattedAddress);
        onPlaceResolved?.(data.place);
      }
    } finally {
      sessionToken.current = crypto.randomUUID();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <input
        name={name}
        className={inputClassName}
        value={value}
        onChange={(event) => {
          onPlaceResolved?.(null);
          onChange(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
      />
      {loading && <span className={styles.spinner} aria-label="Searching addresses" />}
      {open && (
        <div className={styles.menu} id={listId} role="listbox">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.placeId}
              id={`${listId}-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? styles.active : ""}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => void selectSuggestion(suggestion)}
            >
              <LocationIcon />
              <span>
                <strong>{suggestion.mainText}</strong>
                {suggestion.secondaryText && <small>{suggestion.secondaryText}</small>}
              </span>
            </button>
          ))}
          <p className={styles.attribution}>Powered by Google</p>
        </div>
      )}
    </div>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-6.3 7-12A7 7 0 1 0 5 9c0 5.7 7 12 7 12Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="9" r="2.3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
