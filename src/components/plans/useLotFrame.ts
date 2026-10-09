"use client";

import { useEffect, useState } from "react";
import { fetchFeasibility, type FeasibilityResult } from "@/lib/feasibility";
import { deriveReport } from "@/lib/portal/feasibility-summary";
import { computeSiteFrame, type SiteFrame } from "@/lib/site-envelope";
import type { ADUReport } from "@/lib/adu-analysis";
import { isPin, readParcel, saveParcel, type ParcelRef } from "@/lib/parcel-context";

export type LotState =
  | { status: "none" }
  | { status: "loading"; address: string }
  | { status: "ready"; parcel: ParcelRef; data: FeasibilityResult; adu: ADUReport; frame: SiteFrame | null }
  | { status: "error"; message: string };

/**
 * The parcel a visitor is working on, run through the feasibility engine once, with the site frame the master plan
 * uses. Reads ?parcel= then this browser's last parcel; `setAddress` starts from a typed address instead.
 */
export function useLotFrame(search: URLSearchParams | null) {
  const [state, setState] = useState<LotState>({ status: "none" });
  const [query, setQuery] = useState<{ address?: string; pin?: string } | null>(null);

  // First render: pick up the parcel from the URL or this browser.
  useEffect(() => {
    const p = readParcel(search ?? undefined);
    if (p) setQuery({ pin: p.pin, address: p.address || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  useEffect(() => {
    if (!query) return;
    let live = true;
    (async () => {
      try {
        let address = query.address ?? "";
        if (!address && query.pin) {
          setState({ status: "loading", address: "" });
          const r = await fetch(`/api/parcel?pin=${query.pin}`);
          address = r.ok ? ((await r.json()) as { address?: string }).address ?? "" : "";
          if (!address) throw new Error("We could not find that parcel. Enter the address instead.");
        }
        if (live) setState({ status: "loading", address });
        const data = await fetchFeasibility(address);
        const { adu } = deriveReport(data);
        const pin = data.parcel?.pin ?? query.pin ?? "";
        const parcel = { pin, address };
        if (isPin(pin)) {
          saveParcel(parcel);
          const sp = new URLSearchParams(window.location.search);
          sp.set("parcel", pin);
          window.history.replaceState(null, "", `${window.location.pathname}?${sp.toString()}`);
        }
        const frame = data.lot && data.lot.rings.length >= 3 ? computeSiteFrame({ lot: data.lot, sitePlan: data.sitePlan, feasibility: data.feasibility, report: adu }) : null;
        if (live) setState({ status: "ready", parcel, data, adu, frame });
      } catch (e) {
        if (live) setState({ status: "error", message: e instanceof Error ? e.message : "Could not read that lot." });
      }
    })();
    return () => {
      live = false;
    };
  }, [query]);

  return { state, setAddress: (address: string) => setQuery({ address }), clear: () => { setQuery(null); setState({ status: "none" }); } };
}
