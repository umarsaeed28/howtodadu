"use client";

import { useFavorites } from "@/hooks/useFavorites";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

interface AddToFavoritesButtonProps {
  address: string;
  className?: string;
}

export function AddToFavoritesButton({ address, className }: AddToFavoritesButtonProps) {
  const { toggle, isFavorite } = useFavorites();
  const favorited = isFavorite(address);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => toggle(address)}
      className={`gap-2 rounded-full shrink-0 ${favorited ? "border-[var(--aura-accent,#786fa6)]/50 bg-[var(--aura-accent,#786fa6)]/10 text-[var(--aura-accent,#786fa6)]" : ""} ${className ?? ""}`}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`size-4 transition-colors ${favorited ? "fill-[#786fa6]" : ""}`}
        aria-hidden
      />
      {favorited ? "Saved" : "Add to favorites"}
    </Button>
  );
}
