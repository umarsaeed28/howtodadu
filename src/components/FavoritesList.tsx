"use client";

import { useFavorites } from "@/hooks/useFavorites";
import { Heart, X } from "lucide-react";

interface FavoritesListProps {
  onSelectAddress: (address: string) => void;
  variant?: "default" | "aura" | "terra";
}

export function FavoritesList({ onSelectAddress, variant = "default" }: FavoritesListProps) {
  const { favorites, remove } = useFavorites();
  if (favorites.length === 0) return null;

  const isTerra = variant === "aura" || variant === "terra";

  return (
    <div className={`mt-8 p-5 border ${isTerra ? "border-[var(--border)] bg-[var(--card)]" : "border-border bg-muted/30 rounded-xl"}`}>
      <p className={`label mb-3 ${isTerra ? "" : "text-muted-foreground"}`}>
        Your saved properties
      </p>
      <ul className="space-y-2" role="list">
        {favorites.map((fav) => (
          <li
            key={fav.address}
            className="flex items-center gap-2 group"
          >
            <button
              type="button"
              onClick={() => onSelectAddress(fav.address)}
              className={`flex-1 text-left text-sm truncate py-1 ${isTerra ? "text-[var(--foreground)] hover:text-[var(--primary)]" : "text-foreground hover:text-[#786fa6]"}`}
            >
              {fav.address}
            </button>
            <button
              type="button"
              onClick={() => remove(fav.address)}
              className={`shrink-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${isTerra ? "text-[var(--muted-foreground)] hover:text-red-600 hover:bg-red-50" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"}`}
              aria-label={`Remove ${fav.address} from favorites`}
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
