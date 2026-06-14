"use client";

import { Check, Minus, X } from "lucide-react";
import type { Verdict } from "@/lib/parcels";
import { pct } from "@/lib/format";

const CLS: Record<Verdict, string> = {
  PENCILS: "pa-pin-pencils",
  TIGHT: "pa-pin-tight",
  NO: "pa-pin-no",
};
const ICON = { PENCILS: Check, TIGHT: Minus, NO: X };

export default function MapPin({
  verdict,
  marginPct,
  active,
  onClick,
  onEnter,
  onLeave,
}: {
  verdict: Verdict;
  marginPct: number;
  active?: boolean;
  onClick?: () => void;
  onEnter?: () => void;
  onLeave?: () => void;
}) {
  const Icon = ICON[verdict];
  return (
    <button
      type="button"
      className={`pa-pin ${CLS[verdict]} ${active ? "pa-pin-active" : ""}`}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      aria-label={`${verdict}, margin ${pct(marginPct)}`}
    >
      <Icon size={11} strokeWidth={3} aria-hidden />
      <span>{pct(marginPct)}</span>
    </button>
  );
}
