"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Clock, Loader2, MapPin, Search } from "lucide-react";
import { loadRecentAddresses, pushRecentAddress } from "@/lib/recent-addresses";

interface Suggestion {
  formatted: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

const DEBOUNCE_MS = 140;
const MIN_CHARS = 3;

/** Bold the part of the street that matches what was typed, like a maps search box. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().split(",")[0].trim();
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <span style={{ fontWeight: 600 }}>{text}</span>;
  return (
    <span>
      {text.slice(0, i)}
      <strong>{text.slice(i, i + q.length)}</strong>
      {text.slice(i + q.length)}
    </span>
  );
}

const isAbort = (e: unknown) => !!e && typeof e === "object" && (e as { name?: string }).name === "AbortError";
const newSession = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export type AddressAutocompleteProps = {
  value: string;
  onChange: (v: string) => void;
  /** Fired when an address is chosen: a suggestion, a recent address, or Enter on what was typed. */
  onPick: (address: string) => void;
  label: string;
  placeholder?: string;
  loading?: boolean;
  /** "site" for the marketing pages (large field), "app" for the tool pages (inset field). */
  variant?: "site" | "app";
  autoFocus?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /**
   * Choosing a suggestion only fills the box; the surrounding form's button does the rest. Enter with the list
   * closed submits that form, the same as pressing its button.
   */
  fillOnly?: boolean;
};

/**
 * Seattle address autocomplete (WAI-ARIA combobox). Suggestions come from /api/geocode: Google Places when the
 * server has a key, Esri otherwise. Arrow keys move, Enter takes the highlighted match (the top one by default),
 * Escape closes. Each focus starts a session token so Google bills a typing session once.
 */
export default function AddressAutocomplete({ value, onChange, onPick, label, placeholder = "Enter your Seattle address", loading = false, variant = "site", autoFocus, invalid, describedBy, fillOnly = false }: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [active, setActive] = useState(-1);
  const [mode, setMode] = useState<"suggest" | "recent">("recent");
  const [status, setStatus] = useState<"ok" | "none" | "error">("ok");
  const [lastQuery, setLastQuery] = useState("");
  const uid = useId().replace(/:/g, "");
  const listId = `ac-list-${uid}`;
  const optId = (i: number) => `ac-opt-${uid}-${i}`;

  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const sessionRef = useRef<string>("");

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < MIN_CHARS) return;
    if (!sessionRef.current) sessionRef.current = newSession();
    const seq = ++seqRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFetching(true);
    setMode("suggest");
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&session=${sessionRef.current}`, { signal: controller.signal });
      if (seq !== seqRef.current) return;
      if (!res.ok) throw new Error("geocode failed");
      const data = (await res.json()) as Suggestion[];
      setSuggestions(data);
      setLastQuery(q);
      setStatus(data.length ? "ok" : q.length >= 6 ? "none" : "ok");
      setOpen(data.length > 0 || q.length >= 6);
      setActive(data.length > 0 ? 0 : -1);
    } catch (err) {
      if (isAbort(err) || seq !== seqRef.current) return;
      setSuggestions([]);
      setStatus("error");
      setOpen(true);
    } finally {
      if (seq === seqRef.current) setFetching(false);
    }
  }, []);

  function handleChange(val: string) {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatus("ok");
    if (val.trim().length < MIN_CHARS) {
      seqRef.current++;
      abortRef.current?.abort();
      setSuggestions([]);
      setMode("recent");
      const r = loadRecentAddresses();
      setRecent(r);
      setOpen(r.length > 0 && val.trim().length === 0);
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
    sessionRef.current = ""; // the session ends with a choice
    onPick(a);
  }

  const list = mode === "suggest" ? suggestions.map((s) => s.formatted) : recent;
  const showPanel = open && (mode === "suggest" ? suggestions.length > 0 || status !== "ok" : recent.length > 0 && value.trim().length < MIN_CHARS);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      // Like a maps search box: Enter takes the highlighted suggestion (the top match by default), else what was typed.
      if (showPanel && list.length > 0) {
        e.preventDefault();
        commit(list[active >= 0 ? active : 0]);
        return;
      }
      if (fillOnly) return; // the list is closed: let the form submit, as its button would
      e.preventDefault();
      commit(value);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!showPanel || list.length === 0) {
      if (e.key === "ArrowDown" && value.trim().length >= MIN_CHARS) fetchSuggestions(value);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((p) => (p < list.length - 1 ? p + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((p) => (p > 0 ? p - 1 : list.length - 1));
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
    if (active >= 0 && listRef.current) (listRef.current.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const inputId = `ac-in-${uid}`;
  return (
    <div ref={rootRef} className={`ac ac--${variant}`}>
      <div className={variant === "site" ? "fa-field ac-field" : "pa-inset ac-field ac-field--app"} data-invalid={invalid || undefined}>
        {variant === "site" ? <MapPin size={18} aria-hidden /> : <Search size={17} aria-hidden style={{ color: "var(--slate)" }} />}
        <label htmlFor={inputId} className="sr-only">{label}</label>
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (value.trim().length >= MIN_CHARS) {
              setMode("suggest");
              if (suggestions.length) setOpen(true);
              else fetchSuggestions(value);
            } else {
              const r = loadRecentAddresses();
              setRecent(r);
              setMode("recent");
              setOpen(r.length > 0);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && active >= 0 ? optId(active) : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
        {(fetching || loading) && <Loader2 size={16} className="animate-spin" aria-hidden style={{ color: "var(--slate)" }} />}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {showPanel && mode === "suggest" && suggestions.length ? `${suggestions.length} address${suggestions.length === 1 ? "" : "es"} found. Use the arrow keys to choose.` : ""}
      </p>

      {showPanel && (
        <div className="ac-panel">
          {mode === "suggest" && status === "none" && <p className="ac-msg">No Seattle address matches yet. Check the house number and street, or press Enter to try it as typed.</p>}
          {mode === "suggest" && status === "error" && <p className="ac-msg">Address search is slow right now. Press Enter to check the address as typed.</p>}
          {mode === "recent" && <p className="ac-head">Recent</p>}
          <ul ref={listRef} id={listId} role="listbox" aria-label={mode === "recent" ? "Recent addresses" : "Address suggestions"} className="ac-list">
            {mode === "suggest"
              ? suggestions.map((s, i) => (
                  <li key={`${s.formatted}-${i}`} id={optId(i)} role="option" aria-selected={i === active} className="ac-opt" data-active={i === active || undefined} onMouseDown={(e) => e.preventDefault()} onClick={() => commit(s.formatted)} onMouseEnter={() => setActive(i)}>
                    <MapPin size={15} aria-hidden className="ac-icon" />
                    <span className="ac-text">
                      <span className="ac-main"><Highlight text={s.street} query={lastQuery} /></span>
                      <span className="ac-sub">{[s.city, s.state].filter(Boolean).join(", ")}{s.zip ? ` ${s.zip}` : ""}</span>
                    </span>
                  </li>
                ))
              : recent.map((addr, i) => (
                  <li key={`recent-${addr}-${i}`} id={optId(i)} role="option" aria-selected={i === active} className="ac-opt" data-active={i === active || undefined} onMouseDown={(e) => e.preventDefault()} onClick={() => commit(addr)} onMouseEnter={() => setActive(i)}>
                    <Clock size={15} aria-hidden className="ac-icon" />
                    <span className="ac-text"><span className="ac-main">{addr}</span></span>
                  </li>
                ))}
          </ul>
        </div>
      )}
    </div>
  );
}
