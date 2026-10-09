"use client";

import { useId, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import type { LotState } from "./useLotFrame";
import { track } from "@/lib/analytics";
import { prettyAddress } from "@/lib/parcel-context";
import AddressAutocomplete from "@/components/search/AddressAutocomplete";

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
  const go = (raw: string) => {
    const a = raw.trim();
    if (a.length < 5) return setErr("Enter a Seattle street address.");
    track("address_submitted", { source: "feasibility" });
    onAddress(/seattle/i.test(a) ? a : `${a}, Seattle, WA`);
  };
  return (
    <form className="lb" noValidate onSubmit={(e) => { e.preventDefault(); go(value); }}>
      <p className="lb-prompt" id={`${id}-p`}>{prompt}</p>
      <div className="lb-row">
        <AddressAutocomplete value={value} onChange={(v) => { setValue(v); setErr(null); }} onPick={go} label={prompt} invalid={!!err} describedBy={`${id}-p`} />
        <button type="submit" className="s-btn s-btn--primary">Use my lot</button>
      </div>
      {(err || state.status === "error") && <p role="alert" className="fa-err">{err ?? (state.status === "error" ? state.message : "")}</p>}
    </form>
  );
}
