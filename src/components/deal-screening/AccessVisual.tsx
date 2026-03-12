"use client";

import type { AccessInfo } from "@/lib/adu-analysis";
import { getScoreBgClass } from "@/lib/score-colors";
import { Route, ArrowLeftRight, MapPin, Ban } from "lucide-react";

interface AccessVisualProps {
  access: AccessInfo;
  score: number;
}

export function AccessVisual({ access, score }: AccessVisualProps) {
  const sideYard = access.sideYardFt ?? 0;
  const pct = Math.min(100, (sideYard / 20) * 100); // 20 ft as max for scale

  function TypeIcon() {
    switch (access.type) {
      case "alley":
        return <Route className="size-5 text-emerald-600 shrink-0" aria-hidden />;
      case "corner":
        return <MapPin className="size-5 text-emerald-600 shrink-0" aria-hidden />;
      case "side":
        return <ArrowLeftRight className="size-5 text-amber-600 shrink-0" aria-hidden />;
      default:
        return <Ban className="size-5 text-red-500 shrink-0" aria-hidden />;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <TypeIcon />
        <div>
          <p className="text-sm font-medium capitalize">{access.type}</p>
          {access.type === "side" && access.sideYardFt != null && (
            <p className="text-xs text-muted-foreground">Side yard ~{access.sideYardFt} ft</p>
          )}
        </div>
      </div>

      {access.type === "side" && access.sideYardFt != null && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Width</span>
            <span>{access.sideYardFt} ft</span>
          </div>
          <div className="relative h-3 rounded-full overflow-hidden bg-muted-foreground/15">
            <div
              className={`absolute left-0 top-0 h-full rounded-full ${getScoreBgClass(score)}`}
              style={{ width: `${pct}%` }}
            />
            {/* Adequate marker at ~50% (10 ft of 20 ft scale) */}
            <div
              className="absolute top-0 h-full w-0.5 bg-foreground/40"
              style={{ left: "50%" }}
              title="~10 ft recommended"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {access.adequate ? "Adequate for equipment" : "Tight — may need crane delivery"}
          </p>
        </div>
      )}

      {access.type !== "side" && (
        <div className="h-2 w-full rounded-full overflow-hidden bg-muted-foreground/15">
          <div
            className={`h-full rounded-full ${getScoreBgClass(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
    </div>
  );
}
