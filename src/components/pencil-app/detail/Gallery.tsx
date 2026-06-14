"use client";

import { useState } from "react";
import Image from "next/image";
import { Layers } from "lucide-react";
import type { Parcel } from "@/lib/parcels";
import { aerialPhoto } from "@/lib/property-image";

export default function Gallery({ parcel }: { parcel: Parcel }) {
  const shots = [
    { key: "satellite", label: "Satellite", src: aerialPhoto(parcel.lat, parcel.lng, 0.0011, "1200,720") },
    {
      key: "aerial",
      label: "Aerial",
      src: aerialPhoto(parcel.lat, parcel.lng, 0.0032, "1200,720"),
    },
    { key: "massing", label: "Massing render", src: null as string | null },
  ];
  const [active, setActive] = useState(0);
  const current = shots[active];

  return (
    <div>
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[8px] bg-[var(--paper)]">
        {current.src ? (
          <Image
            src={current.src}
            alt={`${current.label} — ${parcel.address}`}
            fill
            sizes="(max-width:1024px) 100vw, 800px"
            className="object-cover"
            unoptimized
            priority
          />
        ) : (
          <MassingSlot />
        )}
      </div>
      <div className="mt-2 flex gap-2">
        {shots.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show ${s.label}`}
            aria-pressed={active === i}
            className="relative h-16 w-24 overflow-hidden rounded-[6px] border"
            style={{
              borderColor: active === i ? "var(--green)" : "var(--hairline)",
              outline: active === i ? "1px solid var(--green)" : "none",
            }}
          >
            {s.src ? (
              <Image src={s.src} alt="" fill sizes="96px" className="object-cover" unoptimized />
            ) : (
              <MassingSlot small />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function MassingSlot({ small }: { small?: boolean }) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-1"
      style={{ background: "var(--green-tint)", color: "var(--green)" }}
    >
      <Layers size={small ? 16 : 28} aria-hidden />
      {!small && <span className="pa-eyebrow">Massing render — coming soon</span>}
    </div>
  );
}
