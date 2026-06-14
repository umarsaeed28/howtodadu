import Link from "next/link";
import Image from "next/image";
import type { Parcel } from "@/lib/parcels";
import { parcels } from "@/lib/parcels";
import { usdM, pct } from "@/lib/format";
import VerdictPill from "../VerdictPill";

export default function SimilarParcels({ parcel }: { parcel: Parcel }) {
  const similar = parcels
    .filter((p) => p.id !== parcel.id && p.verdict === "PENCILS")
    .sort((a, b) => Math.abs(a.marginPct - parcel.marginPct) - Math.abs(b.marginPct - parcel.marginPct))
    .slice(0, 6);

  if (!similar.length) return null;

  return (
    <section>
      <h2 className="pa-display mb-3 text-base">Similar parcels that pencil</h2>
      <div className="pa-scroll flex gap-3 overflow-x-auto pb-2">
        {similar.map((p) => (
          <Link
            key={p.id}
            href={`/app/parcel/${p.id}`}
            className="pa-card w-56 shrink-0 overflow-hidden"
          >
            <div className="relative aspect-[3/2] bg-[var(--paper)]">
              <Image src={p.photo} alt="" fill sizes="224px" className="object-cover" unoptimized />
              <div className="absolute left-2 top-2">
                <VerdictPill verdict={p.verdict} size="sm" />
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-baseline justify-between">
                <span className="pa-mono text-lg font-medium" style={{ color: "var(--green)" }}>
                  {pct(p.marginPct)}
                </span>
                <span className="pa-mono text-xs">{usdM(p.listPrice)}</span>
              </div>
              <p className="pa-mono mt-1 text-xs">{p.address}</p>
              <p className="text-xs" style={{ color: "var(--slate)" }}>
                {p.neighborhood}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
