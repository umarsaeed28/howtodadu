"use client";

import { useState } from "react";
import { Heart, CalendarPlus, FileCheck2, Check, ExternalLink } from "lucide-react";
import type { Parcel } from "@/lib/parcels";
import { zillowUrl } from "@/lib/parcels";
import { usdM } from "@/lib/format";
import { useAppStore } from "@/lib/store";

export default function ActionBar({ parcel }: { parcel: Parcel }) {
  const saved = useAppStore((s) => s.saved.includes(parcel.id));
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const [requested, setRequested] = useState(false);
  const [addedToDeals, setAddedToDeals] = useState(false);

  function requestFeasibility() {
    // TODO: POST to feasibility backend / CRM.
    setRequested(true);
  }
  function addToDeals() {
    // TODO: wire to daily-deals subscription backend.
    setAddedToDeals(true);
  }

  return (
    <div className="space-y-2">
      <div className="hidden items-baseline justify-between md:flex">
        <span className="text-sm" style={{ color: "var(--slate)" }}>
          List price
        </span>
        <span className="pa-mono text-lg font-medium">{usdM(parcel.listPrice)}</span>
      </div>

      {requested ? (
        <div
          className="flex items-center gap-2 rounded-[6px] px-3 py-2.5 text-sm"
          style={{ background: "var(--green-tint)", color: "var(--green)" }}
          role="status"
        >
          <Check size={16} aria-hidden /> Request sent — we’ll email your full feasibility.
        </div>
      ) : (
        <button type="button" className="pa-btn pa-btn-primary w-full" onClick={requestFeasibility}>
          <FileCheck2 size={16} aria-hidden /> Request full feasibility
        </button>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="pa-btn flex-1"
          aria-pressed={saved}
          onClick={() => toggleSaved(parcel.id)}
        >
          <Heart
            size={16}
            aria-hidden
            fill={saved ? "var(--green)" : "none"}
            color={saved ? "var(--green)" : "var(--ink)"}
          />
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          className="pa-btn flex-1"
          aria-pressed={addedToDeals}
          onClick={addToDeals}
          disabled={addedToDeals}
          style={addedToDeals ? { color: "var(--green)", borderColor: "var(--green)" } : undefined}
        >
          {addedToDeals ? <Check size={16} aria-hidden /> : <CalendarPlus size={16} aria-hidden />}
          {addedToDeals ? "In deals" : "Daily deals"}
        </button>
      </div>

      <a
        href={zillowUrl(`${parcel.address}, ${parcel.neighborhood}, Seattle, WA`)}
        target="_blank"
        rel="noopener noreferrer"
        className="pa-btn w-full no-underline"
      >
        <ExternalLink size={16} aria-hidden /> View on Zillow
      </a>
    </div>
  );
}
