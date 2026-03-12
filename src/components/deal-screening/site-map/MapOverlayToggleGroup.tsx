"use client";

export type MapOverlayKey =
  | "sun"
  | "wind"
  | "slope"
  | "buildableEnvelope"
  | "structures"
  | "access"
  | "trees"
  | "adjacency";

export interface MapOverlayToggleGroupProps {
  overlays: Record<MapOverlayKey, boolean>;
  onToggle: (key: MapOverlayKey) => void;
  disabled?: Partial<Record<MapOverlayKey, boolean>>;
  className?: string;
}

const OVERLAY_LABELS: Record<MapOverlayKey, string> = {
  sun: "Sun",
  wind: "Wind",
  slope: "Slope",
  buildableEnvelope: "Buildable envelope",
  structures: "Structures",
  access: "Access",
  trees: "Trees",
  adjacency: "Adjacency",
};

export function MapOverlayToggleGroup({
  overlays,
  onToggle,
  disabled = {},
  className = "",
}: MapOverlayToggleGroupProps) {
  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`}
      role="group"
      aria-label="Map overlay toggles"
    >
      {(Object.keys(OVERLAY_LABELS) as MapOverlayKey[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onToggle(key)}
          disabled={disabled[key]}
          className={`px-2.5 py-1.5 text-[10px] uppercase tracking-wider transition-colors border rounded-sm ${
            overlays[key]
              ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]"
              : "bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--muted-foreground)]"
          } ${disabled[key] ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {OVERLAY_LABELS[key]}
        </button>
      ))}
    </div>
  );
}
