"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "howtodadu-favorites";

export interface FavoriteProperty {
  address: string;
  addedAt: string;
}

function loadFavorites(): FavoriteProperty[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites(items: FavoriteProperty[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const add = useCallback((address: string) => {
    const normalized = address.trim();
    if (!normalized) return;
    setFavorites((prev) => {
      if (prev.some((f) => f.address.toLowerCase() === normalized.toLowerCase())) return prev;
      const next = [...prev, { address: normalized, addedAt: new Date().toISOString() }];
      saveFavorites(next);
      return next;
    });
  }, []);

  const remove = useCallback((address: string) => {
    const normalized = address.trim();
    setFavorites((prev) => {
      const next = prev.filter((f) => f.address.toLowerCase() !== normalized.toLowerCase());
      saveFavorites(next);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (address: string) => {
      const normalized = address.trim();
      setFavorites((prev) => {
        const isFav = prev.some((f) => f.address.toLowerCase() === normalized.toLowerCase());
        const next = isFav
          ? prev.filter((f) => f.address.toLowerCase() !== normalized.toLowerCase())
          : [...prev, { address: normalized, addedAt: new Date().toISOString() }];
        saveFavorites(next);
        return next;
      });
    },
    []
  );

  const isFavorite = useCallback(
    (address: string) =>
      favorites.some((f) => f.address.toLowerCase() === address.trim().toLowerCase()),
    [favorites]
  );

  return { favorites, add, remove, toggle, isFavorite };
}
