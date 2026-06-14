"use client";

import { useEffect, useRef, useState } from "react";
import type { Parcel } from "@/lib/parcels";
import { useAppStore } from "@/lib/store";
import ParcelCard from "./ParcelCard";
import SortMenu from "./SortMenu";
import { EmptyState, NoSearchResults } from "./states";

const PAGE = 6;

export default function ResultsPanel({
  parcels,
  hasSearchText,
  onReset,
}: {
  parcels: Parcel[];
  hasSearchText: boolean;
  onReset: () => void;
}) {
  const [limit, setLimit] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const selectedId = useAppStore((s) => s.selectedId);

  // Reset paging when the result set changes meaningfully.
  useEffect(() => {
    setLimit(PAGE);
  }, [parcels.length]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLimit((l) => Math.min(l + PAGE, parcels.length));
        }
      },
      { root: scrollRef.current, rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [parcels.length]);

  // Scroll the list to the pin the user clicked on the map.
  useEffect(() => {
    if (!selectedId) return;
    const node = cardRefs.current[selectedId];
    if (node) node.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  const shown = parcels.slice(0, limit);

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: "var(--hairline)" }}
      >
        <p className="text-sm" aria-live="polite">
          <span className="pa-mono font-medium">{parcels.length}</span>{" "}
          {parcels.length === 1 ? "parcel" : "parcels"}
        </p>
        <SortMenu />
      </div>

      <div ref={scrollRef} className="pa-scroll flex-1 overflow-y-auto p-4">
        {parcels.length === 0 ? (
          hasSearchText ? (
            <NoSearchResults />
          ) : (
            <EmptyState onReset={onReset} />
          )
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {shown.map((p) => (
                <div
                  key={p.id}
                  ref={(el) => {
                    cardRefs.current[p.id] = el;
                  }}
                >
                  <ParcelCard parcel={p} />
                </div>
              ))}
            </div>
            <div ref={sentinelRef} aria-hidden className="h-6" />
            {limit >= parcels.length && parcels.length > PAGE && (
              <p
                className="py-4 text-center text-xs"
                style={{ color: "var(--slate)" }}
              >
                That’s every parcel in view.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
