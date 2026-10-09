"use client";

import { useId, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import type { LotState } from "./useLotFrame";
import { track } from "@/lib/analytics";
import { prettyAddress } from "@/lib/parcel-context";

/**
 * The lot a page is working on: its address when known, or a box to enter one. Used by the plans and custom
 * journeys, so a visitor who arrives without a parcel can add theirs without leaving the page.
 */
export default function LotBar({ state, onAddress, onClear, prompt }: { state: LotState; onAddress: (a: string) => void; onClear: () => void; prompt: string }) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const id = useId();
  if (state.status === "ready") {
    return (
      <div className="lb lb--set">
        <MapPin size={18} aria-hidden />
        <p className="lb-addr"><span className="lb-k">Your lot</span> {prettyAddress(state.parcel.address)}</p>
        <button type="button" className="lb-change" onClick={onClear}>Change</button>
      </div>
    );
  }
  if (state.status === "loading") {
    return (
      <div className="lb lb--set" role="status" aria-live="polite">
        <Loader2 size={18} className="animate-spin" aria-hidden />
        <p className="lb-addr">Reading your lot{state.address ? `: ${prettyAddress(state.address)}` : ""}…</p>
      </div>
    );
  }
  return (
    <form
      className="lb"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const a = value.trim();
        if (a.length < 5) return setErr("Enter a Seattle street address.");
        track("address_submitted", { source: "feasibility" });
        onAddress(/seattle/i.test(a) ? a : `${a}, Seattle, WA`);
      }}
    >
      <label htmlFor={id} className="lb-prompt">{prompt}</label>
      <div className="lb-row">
        <span className="fa-field">
          <MapPin size={18} aria-hidden />
          <input id={id} value={value} onChange={(e) => { setValue(e.target.value); setErr(null); }} placeholder="Enter your Seattle address" autoComplete="street-address" aria-invalid={!!err} />
        </span>
        <button type="submit" className="s-btn s-btn--primary">Use my lot</button>
      </div>
      {(err || state.status === "error") && <p role="alert" className="fa-err">{err ?? (state.status === "error" ? state.message : "")}</p>}
    </form>
  );
}
