"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2, Clock } from "lucide-react";
import { loadRecentAddresses, pushRecentAddress } from "@/lib/recent-addresses";

interface AddressSuggestion {
  formatted: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
}

function isAbortError(err: unknown): boolean {
  if (err == null) return false;
  if (typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  if (name === "AbortError") return true;
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof Error && err.name === "AbortError") return true;
  return false;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  "aria-invalid"?: boolean;
  variant?: "default" | "aura" | "terra";
}

const DEBOUNCE_MS = 320;

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing an address…",
  id,
  "aria-invalid": ariaInvalid,
  variant = "default",
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelMode, setPanelMode] = useState<"suggest" | "recent">("recent");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    setRecent(loadRecentAddresses());
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort(new DOMException("unmounted", "AbortError"));
    };
  }, []);

  const safeSetState = useCallback(
    (fn: () => void) => {
      if (mountedRef.current) fn();
    },
    []
  );

  const fetchSuggestions = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 3) {
      safeSetState(() => {
        setSuggestions([]);
        setPanelMode("recent");
        setIsOpen(loadRecentAddresses().length > 0);
        setActiveIndex(-1);
      });
      return;
    }

    const seq = ++requestSeqRef.current;

    const prev = abortRef.current;
    if (prev) {
      try {
        prev.abort(new DOMException("superseded", "AbortError"));
      } catch {
        /* ignore */
      }
    }
    const controller = new AbortController();
    abortRef.current = controller;

    safeSetState(() => {
      setLoading(true);
      setPanelMode("suggest");
    });

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });

      if (!mountedRef.current || seq !== requestSeqRef.current) return;

      if (!res.ok) throw new Error("Geocode failed");

      const data: AddressSuggestion[] = await res.json();
      safeSetState(() => {
        setSuggestions(data);
        setIsOpen(data.length > 0);
        setActiveIndex(-1);
      });
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      safeSetState(() => {
        setSuggestions([]);
        setIsOpen(false);
        setActiveIndex(-1);
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (seq === requestSeqRef.current) {
        safeSetState(() => setLoading(false));
      }
    }
  }, [safeSetState]);

  function handleInputChange(val: string) {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = val.trim();
    if (q.length < 3) {
      safeSetState(() => {
        setSuggestions([]);
        setPanelMode("recent");
        const r = loadRecentAddresses();
        setRecent(r);
        setIsOpen(r.length > 0 && document.activeElement === inputRef.current);
        setLoading(false);
      });
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(val), DEBOUNCE_MS);
  }

  function selectSuggestion(suggestion: AddressSuggestion) {
    pushRecentAddress(suggestion.formatted);
    setRecent(loadRecentAddresses());
    onChange(suggestion.formatted);
    safeSetState(() => {
      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      setPanelMode("recent");
    });
    inputRef.current?.focus();
  }

  function selectRecent(addr: string) {
    pushRecentAddress(addr);
    setRecent(loadRecentAddresses());
    onChange(addr);
    safeSetState(() => {
      setIsOpen(false);
      setActiveIndex(-1);
    });
    inputRef.current?.focus();
  }

  const flatListLength =
    panelMode === "suggest" ? suggestions.length : recent.length;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || flatListLength === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < flatListLength - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatListLength - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      if (panelMode === "suggest") selectSuggestion(suggestions[activeIndex]);
      else selectRecent(recent[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(ev.target as Node)
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

  const muted =
    variant === "aura" || variant === "terra"
      ? "text-[var(--muted-foreground)]"
      : "text-muted-foreground";
  const border =
    variant === "aura" || variant === "terra"
      ? "border-[var(--border)] bg-[var(--card)]"
      : "border-border bg-background rounded-xl";
  const itemHover =
    variant === "aura" || variant === "terra"
      ? "hover:bg-[var(--muted)]"
      : "hover:bg-muted/50";
  const itemActive =
    variant === "aura" || variant === "terra" ? "bg-[var(--muted)]" : "bg-muted";

  const showPanel =
    isOpen &&
    (panelMode === "suggest"
      ? suggestions.length > 0
      : recent.length > 0 && value.trim().length < 3);

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
            const r = loadRecentAddresses();
            setRecent(r);
            const v = value.trim();
            if (v.length >= 3) {
              setPanelMode("suggest");
              setIsOpen(true);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => fetchSuggestions(value), 0);
            } else if (r.length > 0) {
              setPanelMode("recent");
              setIsOpen(true);
              setActiveIndex(-1);
            } else if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`flex h-12 w-full border px-4 py-3 text-base transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            variant === "aura" || variant === "terra"
              ? "border-[var(--border)] bg-[var(--card)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)]"
              : "border-input bg-transparent shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          } ${variant === "terra" ? "" : variant === "aura" ? "rounded-full" : ""}`}
          role="combobox"
          aria-expanded={showPanel}
          aria-busy={loading}
          aria-autocomplete="list"
          aria-controls={id ? `${id}-listbox` : undefined}
          aria-activedescendant={
            activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
          }
          aria-invalid={ariaInvalid}
          autoComplete="off"
        />
        {loading && (
          <Loader2
            className={`absolute right-4 top-1/2 -translate-y-1/2 size-4 animate-spin ${variant === "aura" ? "text-[var(--aura-text-muted)]" : "text-muted-foreground"}`}
          />
        )}
      </div>

      {showPanel && (
        <div
          className={`absolute z-50 mt-1 w-full overflow-hidden border shadow-lg ${border} ${variant === "terra" ? "" : "rounded-xl"}`}
        >
          {panelMode === "recent" && recent.length > 0 && (
            <div
              className={`border-b px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${muted} ${variant === "aura" || variant === "terra" ? "border-[var(--border)]" : "border-border"}`}
            >
              Recent
            </div>
          )}
          <ul
            ref={listRef}
            id={id ? `${id}-listbox` : undefined}
            role="listbox"
            aria-label={panelMode === "recent" ? "Recent addresses" : "Address suggestions"}
            className="max-h-64 overflow-y-auto"
          >
            {panelMode === "recent" &&
              recent.map((addr, i) => (
                <li
                  key={`recent-${addr}-${i}`}
                  id={`suggestion-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectRecent(addr)}
                  className={`flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm transition-colors ${itemHover} ${
                    i === activeIndex ? itemActive : ""
                  }`}
                >
                  <Clock
                    className={`mt-0.5 size-3.5 shrink-0 ${variant === "aura" || variant === "terra" ? "text-[var(--primary)]/60" : "text-primary/50"}`}
                    strokeWidth={1.5}
                  />
                  <span className="leading-snug font-medium">{addr}</span>
                </li>
              ))}

            {panelMode === "suggest" &&
              suggestions.map((s, i) => (
                <li
                  key={`${s.formatted}-${i}`}
                  id={`suggestion-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(s)}
                  className={`flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm transition-colors ${itemHover} ${
                    i === activeIndex ? itemActive : ""
                  }`}
                >
                  <MapPin
                    className={`mt-0.5 size-3.5 shrink-0 ${variant === "aura" || variant === "terra" ? "text-[var(--primary)]/60" : "text-primary/50"}`}
                    strokeWidth={1.5}
                  />
                  <span className="leading-snug">
                    <span className="font-medium">{s.street}</span>
                    {(s.city || s.state || s.zip) && (
                      <span className={muted}>
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
        </div>
      )}
    </div>
  );
}
