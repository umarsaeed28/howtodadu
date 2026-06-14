"use client";

import dynamic from "next/dynamic";
import type { Parcel } from "@/lib/parcels";

const ParcelMiniMap = dynamic(() => import("./ParcelMiniMap"), {
  ssr: false,
  loading: () => (
    <div
      className="pa-skeleton h-56 w-full rounded-[8px]"
      style={{ background: "#e4e7e2" }}
      aria-hidden
    />
  ),
});

export default function MiniMapLazy({ parcel }: { parcel: Parcel }) {
  return <ParcelMiniMap parcel={parcel} />;
}
