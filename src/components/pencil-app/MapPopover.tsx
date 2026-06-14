"use client";

import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import type { Parcel } from "@/lib/parcels";
import { usdM, pct } from "@/lib/format";
import VerdictPill from "./VerdictPill";

export default function MapPopover({
  parcel,
  onClose,
}: {
  parcel: Parcel;
  onClose: () => void;
}) {
  return (
    <div className="pa-card w-[240px] overflow-hidden" style={{ boxShadow: "var(--shadow-pop)" }}>
      <div className="relative h-24 bg-[var(--paper)]">
        <Image
          src={parcel.photo}
          alt=""
          fill
          sizes="240px"
          className="object-cover"
          unoptimized
        />
        <div className="absolute left-2 top-2">
          <VerdictPill verdict={parcel.verdict} size="sm" />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--card)]"
          style={{ boxShadow: "var(--shadow-raised)" }}
        >
          <X size={13} aria-hidden />
        </button>
      </div>
      <Link href={`/app/parcel/${parcel.id}`} className="block p-3">
        <div className="flex items-baseline justify-between">
          <span className="pa-mono text-lg font-medium" style={{ color: "var(--green)" }}>
            {pct(parcel.marginPct)}
          </span>
          <span className="pa-mono text-sm">{usdM(parcel.listPrice)}</span>
        </div>
        <p className="pa-mono mt-1 text-xs" style={{ color: "var(--slate)" }}>
          {parcel.unitsUnlocked} units · {parcel.zoning}
        </p>
        <p className="pa-mono mt-1 text-xs">{parcel.address}</p>
        <p className="text-xs" style={{ color: "var(--slate)" }}>
          {parcel.neighborhood}
        </p>
      </Link>
    </div>
  );
}
