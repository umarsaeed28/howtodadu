"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon, List } from "lucide-react";
import { useAppStore, filterParcels, sortParcels } from "@/lib/store";
import { getParcel } from "@/lib/parcels";
import ResultsPanel from "./ResultsPanel";
import MapPopover from "./MapPopover";
import { MapSkeleton } from "./states";

type Bounds = [number, number, number, number];

const ParcelMap = dynamic(() => import("./ParcelMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function SplitView() {
  const filters = useAppStore((s) => s.filters);
  const sort = useAppStore((s) => s.sort);
  const query = useAppStore((s) => s.query);
  const drawPolygon = useAppStore((s) => s.drawPolygon);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const selectedId = useAppStore((s) => s.selectedId);
  const setSelected = useAppStore((s) => s.setSelected);
  const resetFilters = useAppStore((s) => s.resetFilters);

  const [areaBounds, setAreaBounds] = useState<Bounds | null>(null);
  const [moved, setMoved] = useState(false);
  const currentBounds = useRef<Bounds | null>(null);

  const base = useMemo(
    () => sortParcels(filterParcels(filters, drawPolygon, query), sort),
    [filters, drawPolygon, query, sort]
  );

  const list = useMemo(() => {
    if (!areaBounds) return base;
    const [w, s, e, n] = areaBounds;
    return base.filter((p) => p.lng >= w && p.lng <= e && p.lat >= s && p.lat <= n);
  }, [base, areaBounds]);

  const onBoundsChange = useCallback((b: Bounds) => {
    currentBounds.current = b;
  }, []);

  const onSearchHere = useCallback(() => {
    if (currentBounds.current) setAreaBounds(currentBounds.current);
    setMoved(false);
  }, []);

  const selected = selectedId ? getParcel(selectedId) : undefined;
  const onMobile = view;

  return (
    <div className="relative flex min-h-0 flex-1 pb-14 md:pb-0">
      {/* Map pane */}
      <section
        aria-label="Map of parcels"
        className={`${onMobile === "list" ? "hidden" : "block"} h-full w-full md:block md:w-[56%]`}
      >
        <ParcelMap
          parcels={list}
          onBoundsChange={onBoundsChange}
          onUserMove={() => setMoved(true)}
          showSearchHere={moved}
          onSearchHere={onSearchHere}
        />
      </section>

      {/* Results pane */}
      <section
        aria-label="Parcel results"
        className={`${onMobile === "map" ? "hidden" : "block"} h-full w-full border-l bg-[var(--paper)] md:block md:w-[44%]`}
        style={{ borderColor: "var(--hairline)" }}
      >
        <ResultsPanel parcels={list} hasSearchText={query.trim().length > 0} onReset={resetFilters} />
      </section>

      {/* Mobile map/list toggle */}
      <div className="fixed bottom-[68px] left-1/2 z-30 -translate-x-1/2 md:hidden">
        <button
          type="button"
          className="pa-btn"
          style={{ boxShadow: "var(--shadow-pop)", background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }}
          onClick={() => setView(view === "map" ? "list" : "map")}
        >
          {view === "map" ? <List size={16} aria-hidden /> : <MapIcon size={16} aria-hidden />}
          {view === "map" ? "List" : "Map"}
        </button>
      </div>

      {/* Mobile bottom sheet for a selected pin */}
      {selected && view === "map" && (
        <div className="fixed bottom-[68px] left-3 right-3 z-30 md:hidden">
          <MapPopover parcel={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}
