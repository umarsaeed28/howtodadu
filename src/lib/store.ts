"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { parcels as ALL_PARCELS, type Parcel } from "./parcels";

export type SortKey = "margin" | "units" | "newest" | "price";
export type ViewMode = "map" | "list";

export interface Filters {
  priceMin: number | null;
  priceMax: number | null;
  marginMin: number;
  unitsMin: number; // 0 = any
  zoning: string[];
  uses: string[];
  pencilsOnly: boolean;
  lotSizeMin: number | null;
  nearTransitOnly: boolean;
  domMax: number | null;
}

export const defaultFilters: Filters = {
  priceMin: null,
  priceMax: null,
  marginMin: 0,
  unitsMin: 0,
  zoning: [],
  uses: [],
  pencilsOnly: true,
  lotSizeMin: null,
  nearTransitOnly: false,
  domMax: null,
};

interface AppState {
  filters: Filters;
  query: string;
  sort: SortKey;
  view: ViewMode;
  hoveredId: string | null;
  selectedId: string | null;
  saved: string[];
  /** Draw-tool polygon as [lng, lat] vertices, or null. */
  drawPolygon: [number, number][] | null;
  drawing: boolean;

  setQuery: (q: string) => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  toggleInArray: (key: "zoning" | "uses", value: string) => void;
  resetFilters: () => void;
  setSort: (s: SortKey) => void;
  setView: (v: ViewMode) => void;
  setHovered: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  toggleSaved: (id: string) => void;
  setDrawing: (on: boolean) => void;
  setDrawPolygon: (poly: [number, number][] | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      filters: defaultFilters,
      query: "",
      sort: "margin",
      view: "list",
      hoveredId: null,
      selectedId: null,
      saved: [],
      drawPolygon: null,
      drawing: false,

      setQuery: (query) => set({ query }),
      setFilter: (key, value) =>
        set((s) => ({ filters: { ...s.filters, [key]: value } })),
      toggleInArray: (key, value) =>
        set((s) => {
          const arr = s.filters[key];
          const next = arr.includes(value)
            ? arr.filter((v) => v !== value)
            : [...arr, value];
          return { filters: { ...s.filters, [key]: next } };
        }),
      resetFilters: () => set({ filters: defaultFilters }),
      setSort: (sort) => set({ sort }),
      setView: (view) => set({ view }),
      setHovered: (hoveredId) => set({ hoveredId }),
      setSelected: (selectedId) => set({ selectedId }),
      toggleSaved: (id) =>
        set((s) => ({
          saved: s.saved.includes(id)
            ? s.saved.filter((x) => x !== id)
            : [...s.saved, id],
        })),
      setDrawing: (drawing) => set({ drawing }),
      setDrawPolygon: (drawPolygon) => set({ drawPolygon, drawing: false }),
    }),
    {
      name: "pencil-app.v1",
      storage: createJSONStorage(() => localStorage),
      // Only persist user intent, not transient hover/selection.
      partialize: (s) => ({ saved: s.saved, sort: s.sort, filters: s.filters }),
      // Server and first client render use defaults; we rehydrate after mount
      // (see StoreHydrator) so there is never an SSR/client mismatch.
      skipHydration: true,
    }
  )
);

/** Count of non-default filters, for the "X filters applied" readout. */
export function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.priceMin != null) n++;
  if (f.priceMax != null) n++;
  if (f.marginMin > 0) n++;
  if (f.unitsMin > 0) n++;
  if (f.zoning.length) n++;
  if (f.uses.length) n++;
  if (!f.pencilsOnly) n++; // toggled off the default
  if (f.lotSizeMin != null) n++;
  if (f.nearTransitOnly) n++;
  if (f.domMax != null) n++;
  return n;
}

/** Ray-casting point-in-polygon for the Draw tool. poly is [lng,lat][]. */
export function pointInPolygon(lng: number, lat: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function filterParcels(
  filters: Filters,
  drawPolygon: [number, number][] | null,
  query = "",
  source: Parcel[] = ALL_PARCELS
): Parcel[] {
  const q = query.trim().toLowerCase();
  return source.filter((p) => {
    if (q) {
      const hay = `${p.address} ${p.neighborhood} ${p.zoning}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.pencilsOnly && p.verdict !== "PENCILS") return false;
    if (filters.priceMin != null && p.listPrice < filters.priceMin) return false;
    if (filters.priceMax != null && p.listPrice > filters.priceMax) return false;
    if (p.marginPct < filters.marginMin) return false;
    if (filters.unitsMin > 0 && p.unitsUnlocked < filters.unitsMin) return false;
    if (filters.zoning.length && !filters.zoning.includes(p.zoning)) return false;
    if (filters.uses.length && !filters.uses.some((u) => p.bestUse.toLowerCase().includes(u.toLowerCase())))
      return false;
    if (filters.lotSizeMin != null && p.lotSqft < filters.lotSizeMin) return false;
    if (filters.nearTransitOnly && !p.nearTransit) return false;
    if (filters.domMax != null && p.dom > filters.domMax) return false;
    if (drawPolygon && drawPolygon.length >= 3 && !pointInPolygon(p.lng, p.lat, drawPolygon))
      return false;
    return true;
  });
}

export function sortParcels(list: Parcel[], sort: SortKey): Parcel[] {
  const copy = [...list];
  switch (sort) {
    case "margin":
      return copy.sort((a, b) => b.marginPct - a.marginPct);
    case "units":
      return copy.sort((a, b) => b.unitsUnlocked - a.unitsUnlocked);
    case "newest":
      return copy.sort((a, b) => a.dom - b.dom);
    case "price":
      return copy.sort((a, b) => a.listPrice - b.listPrice);
    default:
      return copy;
  }
}
