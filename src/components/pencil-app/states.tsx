"use client";

import { MapPinned, SearchX, RotateCcw } from "lucide-react";

export function CardSkeleton() {
  return (
    <div className="pa-card overflow-hidden">
      <div className="pa-skeleton aspect-[3/2]" />
      <div className="space-y-2 p-3">
        <div className="pa-skeleton h-6 w-24 rounded" />
        <div className="pa-skeleton h-3 w-40 rounded" />
        <div className="pa-skeleton h-4 w-32 rounded" />
      </div>
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="pa-skeleton h-full w-full" aria-hidden style={{ background: "#e4e7e2" }} />
  );
}

export function EmptyState({
  onReset,
  title = "No parcels pencil in this area yet",
  hint = "Widen the map or loosen your filters to see more.",
}: {
  onReset?: () => void;
  title?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--green-tint)", color: "var(--green)" }}
      >
        <MapPinned size={22} aria-hidden />
      </span>
      <h2 className="pa-display text-lg">{title}</h2>
      <p className="mt-1 max-w-xs text-sm" style={{ color: "var(--slate)" }}>
        {hint}
      </p>
      {onReset && (
        <button type="button" className="pa-btn pa-btn-sm mt-4" onClick={onReset}>
          <RotateCcw size={14} aria-hidden /> Reset filters
        </button>
      )}
    </div>
  );
}

export function NoSearchResults() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--paper)", color: "var(--slate)" }}
      >
        <SearchX size={22} aria-hidden />
      </span>
      <h2 className="pa-display text-lg">Nothing matches that search</h2>
      <p className="mt-1 max-w-xs text-sm" style={{ color: "var(--slate)" }}>
        Try a Seattle neighborhood, address, or ZIP.
      </p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <h2 className="pa-display text-lg">Something didn’t load</h2>
      <p className="mt-1 max-w-xs text-sm" style={{ color: "var(--slate)" }}>
        We couldn’t pull parcels just now. Give it another try.
      </p>
      {onRetry && (
        <button type="button" className="pa-btn pa-btn-sm mt-4" onClick={onRetry}>
          <RotateCcw size={14} aria-hidden /> Retry
        </button>
      )}
    </div>
  );
}
