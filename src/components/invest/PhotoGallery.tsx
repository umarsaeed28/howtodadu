"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

/** Up to five images of the property with thumbnails, and a link to the full photo set on Zillow. */
export default function PhotoGallery({ photos, alt, zillowHref }: { photos: string[]; alt: string; zillowHref: string }) {
  const [ok, setOk] = useState(() => photos.map(() => true));
  const list = photos.filter((_, i) => ok[i]);
  const [i, setI] = useState(0);
  const cur = list[Math.min(i, list.length - 1)];
  const fail = (src: string) => setOk((o) => o.map((v, k) => (photos[k] === src ? false : v)));
  return (
    <div className="iv-gallery">
      <div className="iv-hero-photo">
        {cur ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cur} alt={`${alt}, image ${Math.min(i, list.length - 1) + 1} of ${list.length}`} onError={() => fail(cur)} />
        ) : (
          <div className="iv-hero-empty" aria-hidden />
        )}
      </div>
      {list.length > 1 && (
        <div className="iv-thumbs" role="tablist" aria-label="Property images">
          {list.map((src, k) => (
            <button key={src} type="button" role="tab" aria-selected={k === i} aria-label={`Image ${k + 1}`} onClick={() => setI(k)} className="iv-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" onError={() => fail(src)} />
            </button>
          ))}
        </div>
      )}
      <a href={zillowHref} target="_blank" rel="noopener noreferrer" className="iv-zillow"><ExternalLink size={14} aria-hidden /> See all photos on Zillow</a>
    </div>
  );
}
