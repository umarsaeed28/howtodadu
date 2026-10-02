"use client";

import { useState } from "react";

/**
 * A listing photo that degrades gracefully: listing-portal photos often refuse to load on other sites, so a failed
 * image swaps to the fallback (the aerial view) or, without one, to a quiet tinted tile instead of a broken icon.
 */
export default function ListingPhoto({ src, fallback, alt, className, loading }: { src: string; fallback?: string; alt: string; className?: string; loading?: "lazy" | "eager" }) {
  const [current, setCurrent] = useState(src);
  const [failed, setFailed] = useState(false);
  if (failed) return <span aria-hidden className={`block ${className ?? ""}`} style={{ background: "var(--green-tint)" }} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      loading={loading}
      className={className}
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
        else setFailed(true);
      }}
    />
  );
}
