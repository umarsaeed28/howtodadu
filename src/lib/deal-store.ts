"use client";

import { create } from "zustand";
import { computeFeasibility, type DealInputs, type DealResult } from "@/lib/feasibility/model";

/** Groups that map one-to-one to the expandable assumption panels. */
export type DealGroup = "acquisition" | "hard" | "soft" | "financing" | "exit";

interface DealEntry {
  inputs: DealInputs;
  /** The baseline this deal was seeded with, for the edited dot and reset. */
  defaults: DealInputs;
}

interface DealState {
  deals: Record<string, DealEntry>;
  /** Seed a deal once; later calls are no-ops so user edits survive re-render. */
  ensure: (dealId: string, initial: DealInputs) => void;
  setField: <G extends DealGroup, K extends keyof DealInputs[G]>(
    dealId: string,
    group: G,
    key: K,
    value: DealInputs[G][K]
  ) => void;
  resetGroup: (dealId: string, group: DealGroup) => void;
  resetAll: (dealId: string) => void;
  /** Unit count lives outside the groups; used when switching build scenario. */
  setUnits: (dealId: string, units: number) => void;
  /** Replace all inputs (e.g. switching build scenario). Keeps the seeded defaults. */
  setInputs: (dealId: string, inputs: DealInputs) => void;
}

function clone(inputs: DealInputs): DealInputs {
  return structuredClone(inputs);
}

/**
 * Session-memory deal store. Holds DealInputs per parcel/deal. No browser
 * storage: assumptions reset on reload by design.
 */
export const useDealStore = create<DealState>((set) => ({
  deals: {},

  ensure: (dealId, initial) =>
    set((s) => {
      if (s.deals[dealId]) return s;
      return {
        deals: { ...s.deals, [dealId]: { inputs: clone(initial), defaults: clone(initial) } },
      };
    }),

  setField: (dealId, group, key, value) =>
    set((s) => {
      const entry = s.deals[dealId];
      if (!entry) return s;
      const nextGroup = { ...entry.inputs[group], [key]: value };
      const inputs = { ...entry.inputs, [group]: nextGroup };
      return { deals: { ...s.deals, [dealId]: { ...entry, inputs } } };
    }),

  resetGroup: (dealId, group) =>
    set((s) => {
      const entry = s.deals[dealId];
      if (!entry) return s;
      const inputs = { ...entry.inputs, [group]: clone(entry.defaults)[group] };
      return { deals: { ...s.deals, [dealId]: { ...entry, inputs } } };
    }),

  resetAll: (dealId) =>
    set((s) => {
      const entry = s.deals[dealId];
      if (!entry) return s;
      return { deals: { ...s.deals, [dealId]: { ...entry, inputs: clone(entry.defaults) } } };
    }),

  setUnits: (dealId, units) =>
    set((s) => {
      const entry = s.deals[dealId];
      if (!entry) return s;
      const nextUnits = Math.max(units, 1);
      // Scale new-build area with unit count so cost tracks units rather than
      // revenue ballooning against a fixed build cost. Preserves avg unit size.
      const prevUnits = Math.max(entry.inputs.units, 1);
      const perUnitSqft = entry.inputs.hard.buildableSqft / prevUnits;
      const buildableSqft = Math.round(perUnitSqft * nextUnits);
      // Resize per-unit ARV to match the new unit count: keep existing prices,
      // fill any new units with the last known price (or the per-unit fallback).
      const prevPrices = entry.inputs.exit.unitSalePrices ?? [];
      const fillPrice =
        prevPrices[prevPrices.length - 1] ?? entry.inputs.exit.salePricePerUnit ?? 0;
      const unitSalePrices = Array.from(
        { length: nextUnits },
        (_, i) => prevPrices[i] ?? fillPrice
      );
      const inputs: DealInputs = {
        ...entry.inputs,
        units: nextUnits,
        hard: { ...entry.inputs.hard, buildableSqft, hardCostOverride: undefined },
        exit: { ...entry.inputs.exit, unitSalePrices },
      };
      return { deals: { ...s.deals, [dealId]: { ...entry, inputs } } };
    }),

  setInputs: (dealId, inputs) =>
    set((s) => {
      const entry = s.deals[dealId];
      if (!entry) return s;
      return { deals: { ...s.deals, [dealId]: { ...entry, inputs: clone(inputs) } } };
    }),
}));

/** Inputs for a deal, or null until ensured. */
export function useDealInputs(dealId: string): DealInputs | null {
  return useDealStore((s) => s.deals[dealId]?.inputs ?? null);
}

/** Baseline a deal was seeded with, for edited-vs-default comparisons. */
export function useDealDefaults(dealId: string): DealInputs | null {
  return useDealStore((s) => s.deals[dealId]?.defaults ?? null);
}

/** Live derived result. Recomputed whenever inputs change. */
export function useDealResult(dealId: string): DealResult | null {
  const inputs = useDealInputs(dealId);
  return inputs ? computeFeasibility(inputs) : null;
}
