"use client";

import { Star } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

interface FavoriteStarButtonProps {
  address: string;
  className?: string;
}

export function FavoriteStarButton({ address, className = "" }: FavoriteStarButtonProps) {
  const { toggle, isFavorite } = useFavorites();
  const on = isFavorite(address);

  return (
    <button
      type="button"
      onClick={() => toggle(address)}
      className={`inline-flex size-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-[var(--feasibility-accent,#0d9488)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--feasibility-accent,#0d9488)] ${on ? "text-[var(--feasibility-accent,#0d9488)]" : ""} ${className}`}
      aria-label={on ? `Remove ${address} from favorites` : `Add ${address} to favorites`}
      aria-pressed={on}
    >
      <Star className={`size-4 ${on ? "fill-current" : ""}`} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
