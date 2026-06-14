"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2, MapPin, Clock } from "lucide-react";
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

const DEBOUNCE_MS = 280;

function isAbortError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    (err as { name?: string }).name === "AbortError"
  );
}

export default function FeasAddressSearch({
  value,
  onChange,
  onPick,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Fired when the user commits an address (suggestion, recent, or raw Enter). */
  onPick: (address: string) => void;
  loading: boolean;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [active, setActive] = useState(-1);
  const [mode, setMode] = useState<"suggest" | "recent">("recent");

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 3) return;
    const seq = ++seqRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFetching(true);
    setMode("suggest");
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      if (seq !== seqRef.current) return;
      if (!res.ok) throw new Error("geocode failed");
      const data: AddressSuggestion[] = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
      setActive(-1);
    } catch (err) {
      if (isAbortError(err)) return;
      setSuggestions([]);
    } finally {
      if (seq === seqRef.current) setFetching(false);
    }
  }, []);

  function handleChange(val: string) {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 3) {
      setSuggestions([]);
      setMode("recent");
      const r = loadRecentAddresses();
      setRecent(r);
      setOpen(r.length > 0);
      setActive(-1);
      setFetching(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(val), DEBOUNCE_MS);
  }

  function commit(address: string) {
    const a = address.trim();
    if (!a) return;
    pushRecentAddress(a);
    onChange(a);
    setSuggestions([]);
    setOpen(false);
    setActive(-1);
    setMode("recent");
    onPick(a);
  }

  const list = mode === "suggest" ? suggestions.map((s) => s.formatted) : recent;
  const showPanel =
    open &&
    (mode === "suggest" ? suggestions.length > 0 : recent.length > 0 && value.trim().length < 3);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (showPanel && active >= 0 && list[active]) {
        e.preventDefault();
        commit(list[active]);
      }
      // otherwise let the form submit with the raw value
      return;
    }
    if (!showPanel || list.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((p) => (p < list.length - 1 ? p + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((p) => (p > 0 ? p - 1 : list.length - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  useEffect(() => {
    function onDown(ev: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (active >= 0 && listRef.current) {
      (listRef.current.children[active] as HTMLElement)?.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  return (
    <div ref={rootRef} className="relative flex-1">
      <div
        className="flex items-center gap-2 rounded-[8px] border px-3"
        style={{ background: "var(--paper)", borderColor: "var(--hairline)", minHeight: 44 }}
      >
        <Search size={17} aria-hidden style={{ color: "var(--slate)" }} />
        <label htmlFor="feas-search" className="sr-only">
          Seattle address
        </label>
        <input
          ref={inputRef}
          id="feas-search"
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (value.trim().length >= 3) {
              setMode("suggest");
              if (suggestions.length > 0) setOpen(true);
              else fetchSuggestions(value);
            } else {
              const r = loadRecentAddresses();
              setRecent(r);
              setMode("recent");
              setOpen(r.length > 0);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter a Seattle address"
          className="w-full bg-transparent py-2 text-sm outline-none"
          style={{ color: "var(--ink)" }}
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="feas-search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `feas-opt-${active}` : undefined}
        />
        {(fetching || loading) && (
          <Loader2 size={16} className="animate-spin" aria-hidden style={{ color: "var(--slate)" }} />
        )}
      </div>

      {showPanel && (
        <div
          className="pa-card absolute left-0 right-0 z-50 mt-2 overflow-hidden p-1"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          {mode === "recent" && (
            <p className="pa-eyebrow px-2.5 pb-1 pt-2" style={{ color: "var(--slate)" }}>
              Recent
            </p>
          )}
          <ul
            ref={listRef}
            id="feas-search-listbox"
            role="listbox"
            aria-label={mode === "recent" ? "Recent addresses" : "Address suggestions"}
            className="pa-scroll max-h-72 overflow-y-auto"
          >
            {mode === "suggest"
              ? suggestions.map((s, i) => (
                  <li
                    key={`${s.formatted}-${i}`}
                    id={`feas-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(s.formatted)}
                    className="flex cursor-pointer items-start gap-2.5 rounded-[5px] px-2.5 py-2.5 text-sm"
                    style={{ background: i === active ? "var(--paper)" : "transparent" }}
                  >
                    <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden style={{ color: "var(--green)" }} />
                    <span className="leading-snug">
                      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{s.street}</span>
                      {(s.city || s.state || s.zip) && (
                        <span style={{ color: "var(--slate)" }}>
                          {" · "}
                          {[s.city, s.state, s.zip].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </span>
                  </li>
                ))
              : recent.map((addr, i) => (
                  <li
                    key={`recent-${addr}-${i}`}
                    id={`feas-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(addr)}
                    className="flex cursor-pointer items-start gap-2.5 rounded-[5px] px-2.5 py-2.5 text-sm"
                    style={{ background: i === active ? "var(--paper)" : "transparent" }}
                  >
                    <Clock size={15} className="mt-0.5 shrink-0" aria-hidden style={{ color: "var(--green)" }} />
                    <span className="leading-snug" style={{ color: "var(--ink)" }}>
                      {addr}
                    </span>
                  </li>
                ))}
          </ul>
        </div>
      )}
    </div>
  );
}
