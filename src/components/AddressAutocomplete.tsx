"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface AddressSuggestion {
  formatted: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  "aria-invalid"?: boolean;
  variant?: "default" | "aura" | "terra";
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing an address…",
  id,
  "aria-invalid": ariaInvalid,
  variant = "default",
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const res = await fetch(
        `/api/geocode?q=${encodeURIComponent(query)}`,
        { signal: abortRef.current.signal }
      );

      if (!res.ok) throw new Error("Geocode failed");

      const data: AddressSuggestion[] = await res.json();
      setSuggestions(data);
      setIsOpen(data.length > 0);
      setActiveIndex(-1);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(val: string) {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250);
  }

  function selectSuggestion(suggestion: AddressSuggestion) {
    onChange(suggestion.formatted);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`flex h-12 w-full border px-4 py-3 text-base transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            variant === "aura" || variant === "terra"
              ? "border-[var(--border)] bg-[var(--card)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)]"
              : "border-input bg-transparent shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          } ${variant === "terra" ? "" : variant === "aura" ? "rounded-full" : ""}`}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={id ? `${id}-listbox` : undefined}
          aria-activedescendant={
            activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
          }
          aria-invalid={ariaInvalid}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className={`absolute right-4 top-1/2 -translate-y-1/2 size-4 animate-spin ${variant === "aura" ? "text-[var(--aura-text-muted)]" : "text-muted-foreground"}`} />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className={`absolute z-50 mt-1 w-full border shadow-lg overflow-hidden ${
            variant === "aura" || variant === "terra"
              ? "border-[var(--border)] bg-[var(--card)]"
              : "border-border bg-background rounded-xl"
          } ${variant === "terra" ? "" : "rounded-xl"}`}
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.formatted}-${i}`}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => selectSuggestion(s)}
              className={`flex items-start gap-3 px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                variant === "aura" || variant === "terra"
                  ? i === activeIndex ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"
                  : i === activeIndex ? "bg-muted" : "hover:bg-muted/50"
              }`}
            >
              <MapPin
                className={`size-3.5 mt-0.5 shrink-0 ${variant === "aura" || variant === "terra" ? "text-[var(--primary)]/60" : "text-primary/50"}`}
                strokeWidth={1.5}
              />
              <span className="leading-snug">
                <span className="font-medium">{s.street}</span>
                {(s.city || s.state || s.zip) && (
                  <span className={variant === "aura" || variant === "terra" ? "text-[var(--muted-foreground)]" : "text-muted-foreground"}>
                    {" "}
                    &middot; {[s.city, s.state, s.zip]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
