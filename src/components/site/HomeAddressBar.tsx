"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Loader2 } from "lucide-react";

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

export default function HomeAddressBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [active, setActive] = useState(-1);

  const rootRef = useRef<HTMLFormElement>(null);
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
    const term = query.trim();
    if (term.length < 3) return;
    const seq = ++seqRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFetching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, {
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
    setQ(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      setActive(-1);
      setFetching(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(val), DEBOUNCE_MS);
  }

  function go(address: string) {
    const v = address.trim();
    router.push(v ? `/feasibility?address=${encodeURIComponent(v)}` : "/feasibility");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (open && active >= 0 && suggestions[active]) {
      go(suggestions[active].formatted);
    } else {
      go(q);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((p) => (p < suggestions.length - 1 ? p + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((p) => (p > 0 ? p - 1 : suggestions.length - 1));
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
    <form
      ref={rootRef}
      onSubmit={submit}
      style={{ display: "flex", gap: 10, maxWidth: "36rem", width: "100%", flexWrap: "wrap", position: "relative" }}
    >
      <div style={{ position: "relative", flex: "1 1 14rem" }}>
        <Search
          size={18}
          aria-hidden
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--slate)" }}
        />
        <label htmlFor="home-address" className="sr-only">
          Seattle address
        </label>
        <input
          id="home-address"
          type="text"
          value={q}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (q.trim().length >= 3 && suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter a Seattle address"
          className="s-field"
          style={{ minHeight: 52, paddingLeft: 42, paddingRight: fetching ? 40 : undefined }}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="home-address-listbox"
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `home-opt-${active}` : undefined}
        />
        {fetching && (
          <Loader2
            size={16}
            className="animate-spin"
            aria-hidden
            style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--slate)" }}
          />
        )}

        {open && suggestions.length > 0 && (
          <ul
            ref={listRef}
            id="home-address-listbox"
            role="listbox"
            aria-label="Address suggestions"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "calc(100% + 8px)",
              zIndex: 50,
              margin: 0,
              padding: 6,
              listStyle: "none",
              maxHeight: 300,
              overflowY: "auto",
              background: "var(--surface)",
              border: 0,
              borderRadius: "var(--radius-ctl)",
              boxShadow: "var(--nm-out)",
              textAlign: "left",
            }}
          >
            {suggestions.map((s, i) => (
              <li
                key={`${s.formatted}-${i}`}
                id={`home-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(s.formatted)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  cursor: "pointer",
                  padding: "10px 12px",
                  borderRadius: 10,
                  fontSize: "0.95rem",
                  lineHeight: 1.4,
                  background: i === active ? "var(--flag-tint)" : "transparent",
                }}
              >
                <MapPin size={15} aria-hidden style={{ marginTop: 3, flexShrink: 0, color: "var(--flag-deep)" }} />
                <span>
                  <span style={{ color: "var(--ink)", fontWeight: 500 }}>{s.street}</span>
                  {(s.city || s.state || s.zip) && (
                    <span style={{ color: "var(--slate)" }}>
                      {" · "}
                      {[s.city, s.state, s.zip].filter(Boolean).join(", ")}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="submit" className="s-btn s-btn--primary s-btn--lg">
        Check this address
      </button>
    </form>
  );
}
