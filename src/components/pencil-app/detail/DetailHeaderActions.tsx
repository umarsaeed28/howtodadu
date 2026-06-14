"use client";

import { useState } from "react";
import { Heart, Share2, Check } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function DetailHeaderActions({ parcelId }: { parcelId: string }) {
  const saved = useAppStore((s) => s.saved.includes(parcelId));
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const [copied, setCopied] = useState(false);

  async function share() {
    // TODO: richer share sheet. For now, copy the deep link.
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="pa-btn pa-btn-sm"
        aria-pressed={saved}
        onClick={() => toggleSaved(parcelId)}
      >
        <Heart
          size={15}
          aria-hidden
          fill={saved ? "var(--green)" : "none"}
          color={saved ? "var(--green)" : "var(--ink)"}
        />
        {saved ? "Saved" : "Save"}
      </button>
      <button type="button" className="pa-btn pa-btn-sm" onClick={share}>
        {copied ? <Check size={15} aria-hidden /> : <Share2 size={15} aria-hidden />}
        {copied ? "Copied" : "Share"}
      </button>
    </div>
  );
}
