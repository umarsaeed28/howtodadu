"use client";

import { Heart } from "lucide-react";
import { useSavedListings, type SavedListing } from "@/hooks/useSavedListings";

/** Save or unsave a home for this browser session. `overlay` is the round button on a photo. */
export default function SaveButton({ item, variant = "button" }: { item: Omit<SavedListing, "savedAt">; variant?: "button" | "overlay" }) {
  const { isSaved, toggle } = useSavedListings();
  const on = isSaved(item.mlsId);
  const label = on ? `Remove ${item.address} from saved homes` : `Save ${item.address}`;
  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(item);
  };
  if (variant === "overlay")
    return (
      <button type="button" onClick={click} aria-pressed={on} aria-label={label} title={on ? "Saved" : "Save"} className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90" style={{ background: "rgba(255,255,255,.94)", boxShadow: "0 1px 4px rgba(17,22,20,.2)" }}>
        <Heart size={17} aria-hidden fill={on ? "#C2412D" : "none"} color={on ? "#C2412D" : "#17241D"} strokeWidth={2} />
      </button>
    );
  return (
    <button type="button" onClick={click} aria-pressed={on} aria-label={label} className="pa-btn pa-btn-sm">
      <Heart size={14} aria-hidden fill={on ? "#C2412D" : "none"} color={on ? "#C2412D" : "currentColor"} /> {on ? "Saved" : "Save"}
    </button>
  );
}
