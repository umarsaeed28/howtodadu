"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { searchHref } from "@/lib/search-filters";
import { PriceRange, ZipChips } from "./ZipPriceFields";

/**
 * The home page search: up to five Seattle ZIP codes and a price range, then the map with those filters on.
 * A quiet link underneath goes to the single-property check.
 */
export default function HomeSearch() {
  const router = useRouter();
  const [zips, setZips] = useState<string[]>([]);
  const [range, setRange] = useState({ min: 0, max: 0 });

  return (
    <div>
      <form
        className="s-card"
        style={{ padding: "clamp(12px, 1.6vw, 16px)" }}
        onSubmit={(e) => {
          e.preventDefault();
          router.push(searchHref({ zips, ...range }));
        }}
        aria-label="Search Seattle homes that can take a DADU"
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <p className="s-label" style={{ marginBottom: 6 }}>ZIP codes <span style={{ fontWeight: 400, color: "var(--slate)" }}>(Seattle, up to 5)</span></p>
            <ZipChips zips={zips} onChange={setZips} size="lg" placeholder="98103, 98107…" />
          </div>
          <div>
            <p className="s-label" style={{ marginBottom: 6 }}>Price range</p>
            <PriceRange min={range.min} max={range.max} onChange={setRange} size="lg" />
          </div>
          <button type="submit" className="s-btn s-btn--primary s-btn--lg" style={{ width: "100%" }}>
            <Search size={17} aria-hidden /> {zips.length ? `Search ${zips.length} ZIP${zips.length === 1 ? "" : "s"}` : "Search all of Seattle"}
          </button>
        </div>
      </form>
      <p className="s-body" style={{ marginTop: 14, fontSize: "0.95rem" }}>
        Have one property in mind?{" "}
        <Link href="/feasibility" className="s-btn s-btn--ghost" style={{ minHeight: 0, padding: 0, fontSize: "inherit" }}>
          Check a single address <ArrowRight size={14} aria-hidden />
        </Link>
      </p>
    </div>
  );
}
