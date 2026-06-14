import type { Parcel } from "@/lib/parcels";
import { usdM, pct } from "@/lib/format";
import VerdictPill from "../VerdictPill";

function Figure({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex-1">
      <p className="pa-eyebrow" style={{ color: "var(--slate)" }}>
        {label}
      </p>
      <p
        className="pa-mono text-lg font-medium"
        style={{ color: accent ? "var(--green)" : "var(--ink)" }}
      >
        {value}
      </p>
    </div>
  );
}

export default function VerdictBlock({ parcel }: { parcel: Parcel }) {
  const marginColor =
    parcel.verdict === "PENCILS"
      ? "var(--green)"
      : parcel.verdict === "TIGHT"
        ? "var(--amber)"
        : "var(--red)";
  return (
    <div className="pa-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <VerdictPill verdict={parcel.verdict} size="lg" />
        <span className="pa-mono text-4xl font-medium leading-none" style={{ color: marginColor }}>
          {pct(parcel.marginPct)}
        </span>
        <span className="text-sm" style={{ color: "var(--slate)" }}>
          margin
        </span>
      </div>

      <p className="pa-mono mt-3 text-sm">
        {parcel.zoning} → {parcel.unitsUnlocked} units ·{" "}
        <span style={{ color: "var(--slate)" }}>best use:</span> {parcel.bestUse}
      </p>

      <div
        className="mt-4 flex gap-4 border-t pt-4"
        style={{ borderColor: "var(--hairline)" }}
      >
        <Figure label="All-in" value={usdM(parcel.allInCost)} />
        <Figure label="Projected value" value={usdM(parcel.projectedValue)} />
        <Figure label="Margin" value={pct(parcel.marginPct)} accent />
      </div>
    </div>
  );
}
