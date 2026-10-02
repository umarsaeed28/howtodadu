"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Homes the visitor saves while browsing. Kept for this browser session (sessionStorage): it survives reloads and moving
 * between pages, and clears when the tab is closed. No account needed. Every component reading it stays in step.
 */
export interface SavedListing {
  /** The listing id, or `pin-<PIN>` for an off-market lot. */
  mlsId: string;
  address: string;
  /** List price; 0 for off-market. */
  price: number;
  photo: string | null;
  score: number;
  /** On the market (a listing) or off (a lot in the buy box). Older saves have no value and are on-market. */
  market?: "on" | "off";
  pin?: string;
  tier?: number;
  lotSqft?: number | null;
  daduSqft?: number | null;
  daysOnMarket?: number | null;
  savedAt: string;
}

const KEY = "pencil-saved-listings";
const EVENT = "pencil-saved-change";
const EMPTY: SavedListing[] = [];
let cache: { raw: string | null; list: SavedListing[] } = { raw: null, list: EMPTY };

function read(): SavedListing[] {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw === cache.raw) return cache.list;
    const parsed = raw ? JSON.parse(raw) : [];
    cache = { raw, list: Array.isArray(parsed) ? parsed : EMPTY };
    return cache.list;
  } catch {
    return EMPTY;
  }
}

function write(list: SavedListing[]) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked: the list still works until the page reloads */
    cache = { raw: null, list };
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export function useSavedListings() {
  const saved = useSyncExternalStore(subscribe, read, () => EMPTY);
  const isSaved = useCallback((mlsId: string) => saved.some((s) => s.mlsId === mlsId), [saved]);
  const toggle = useCallback((item: Omit<SavedListing, "savedAt">) => {
    const list = read();
    write(list.some((s) => s.mlsId === item.mlsId) ? list.filter((s) => s.mlsId !== item.mlsId) : [{ ...item, savedAt: new Date().toISOString() }, ...list]);
  }, []);
  return { saved, isSaved, toggle };
}
