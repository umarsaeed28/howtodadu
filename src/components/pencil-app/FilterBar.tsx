"use client";

import { useState } from "react";
import { Search, RotateCcw, Check, BellPlus } from "lucide-react";
import FilterPopover from "./FilterPopover";
import { ALL_ZONING, USE_OPTIONS } from "@/lib/parcels";
import { useAppStore, countActiveFilters } from "@/lib/store";
import { usd } from "@/lib/format";

function priceField(v: number | null) {
  return v == null ? "" : String(v);
}

export default function FilterBar() {
  const filters = useAppStore((s) => s.filters);
  const setFilter = useAppStore((s) => s.setFilter);
  const toggleInArray = useAppStore((s) => s.toggleInArray);
  const resetFilters = useAppStore((s) => s.resetFilters);
  const query = useAppStore((s) => s.query);
  const setQuery = useAppStore((s) => s.setQuery);
  const active = countActiveFilters(filters);
  const [searchSaved, setSearchSaved] = useState(false);

  function saveSearch() {
    // TODO: persist this filter set server-side and email new matches.
    setSearchSaved(true);
    setTimeout(() => setSearchSaved(false), 2200);
  }

  const priceSummary =
    filters.priceMin != null || filters.priceMax != null
      ? `${filters.priceMin != null ? usd(filters.priceMin) : "Any"}–${
          filters.priceMax != null ? usd(filters.priceMax) : "Any"
        }`
      : null;

  return (
    <div
      className="sticky top-[53px] z-20 border-b bg-[var(--paper)]"
      style={{ borderColor: "var(--hairline)" }}
    >
      {/* Mobile search collapses into the filter bar */}
      <div className="md:hidden px-3 pt-2">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--slate)" }}
            aria-hidden
          />
          <label htmlFor="pa-search-m" className="sr-only">
            Search address, neighborhood, or ZIP
          </label>
          <input
            id="pa-search-m"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Address, neighborhood, or ZIP"
            className="w-full rounded-[6px] border bg-[var(--card)] py-2 pl-9 pr-3 text-sm pa-mono"
            style={{ borderColor: "var(--hairline)" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto pa-scroll">
        {/* Price */}
        <FilterPopover label="Price" active={priceSummary != null} summary={priceSummary}>
          {() => (
            <div className="space-y-3">
              <p className="pa-eyebrow" style={{ color: "var(--slate)" }}>
                List price
              </p>
              <div className="flex items-center gap-2">
                <NumInput
                  aria-label="Minimum price"
                  placeholder="No min"
                  value={priceField(filters.priceMin)}
                  onChange={(v) => setFilter("priceMin", v)}
                />
                <span style={{ color: "var(--slate)" }}>–</span>
                <NumInput
                  aria-label="Maximum price"
                  placeholder="No max"
                  value={priceField(filters.priceMax)}
                  onChange={(v) => setFilter("priceMax", v)}
                />
              </div>
            </div>
          )}
        </FilterPopover>

        {/* Margin — the Pencil-specific filter */}
        <FilterPopover
          label="Margin"
          active={filters.marginMin > 0}
          summary={`Margin ≥ ${filters.marginMin}%`}
        >
          {() => (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="pa-eyebrow" style={{ color: "var(--slate)" }}>
                  Min margin
                </p>
                <span className="pa-mono text-sm" style={{ color: "var(--green)" }}>
                  ≥ {filters.marginMin}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={filters.marginMin}
                onChange={(e) => setFilter("marginMin", Number(e.target.value))}
                className="w-full accent-[var(--green)]"
                aria-label="Minimum margin percent"
              />
              <div className="flex justify-between pa-mono text-[0.7rem]" style={{ color: "var(--slate)" }}>
                <span>0%</span>
                <span>15%</span>
                <span>30%</span>
              </div>
            </div>
          )}
        </FilterPopover>

        {/* Units */}
        <FilterPopover
          label="Units"
          active={filters.unitsMin > 0}
          summary={`${filters.unitsMin}+ units`}
        >
          {() => (
            <div className="space-y-2">
              <p className="pa-eyebrow" style={{ color: "var(--slate)" }}>
                Min units unlocked
              </p>
              <div className="flex gap-2">
                {[0, 2, 4, 6].map((u) => (
                  <button
                    key={u}
                    type="button"
                    className={`pa-chip ${filters.unitsMin === u ? "pa-chip-active" : ""}`}
                    onClick={() => setFilter("unitsMin", u)}
                  >
                    {u === 0 ? "Any" : u === 6 ? "6+" : u}
                  </button>
                ))}
              </div>
            </div>
          )}
        </FilterPopover>

        {/* Zoning */}
        <FilterPopover
          label="Zoning"
          active={filters.zoning.length > 0}
          summary={`Zoning · ${filters.zoning.length}`}
        >
          {() => (
            <div className="space-y-2">
              <p className="pa-eyebrow" style={{ color: "var(--slate)" }}>
                Zoning
              </p>
              <div className="grid grid-cols-3 gap-2">
                {ALL_ZONING.map((z) => (
                  <CheckChip
                    key={z}
                    label={z}
                    checked={filters.zoning.includes(z)}
                    onClick={() => toggleInArray("zoning", z)}
                  />
                ))}
              </div>
            </div>
          )}
        </FilterPopover>

        {/* Use */}
        <FilterPopover
          label="Use"
          active={filters.uses.length > 0}
          summary={`Use · ${filters.uses.length}`}
          width={300}
        >
          {() => (
            <div className="space-y-2">
              <p className="pa-eyebrow" style={{ color: "var(--slate)" }}>
                Best use
              </p>
              <div className="flex flex-wrap gap-2">
                {USE_OPTIONS.map((u) => (
                  <CheckChip
                    key={u}
                    label={u}
                    checked={filters.uses.includes(u)}
                    onClick={() => toggleInArray("uses", u)}
                  />
                ))}
              </div>
            </div>
          )}
        </FilterPopover>

        {/* Verdict toggle: Pencils only (default on) */}
        <button
          type="button"
          className={`pa-chip ${filters.pencilsOnly ? "pa-chip-active" : ""}`}
          aria-pressed={filters.pencilsOnly}
          onClick={() => setFilter("pencilsOnly", !filters.pencilsOnly)}
        >
          {filters.pencilsOnly ? <Check size={14} aria-hidden /> : null}
          Pencils only
        </button>

        {/* More */}
        <FilterPopover label="More" active={false} width={300} align="left">
          {() => (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="pa-eyebrow" style={{ color: "var(--slate)" }}>
                  Min lot size (sqft)
                </p>
                <NumInput
                  aria-label="Minimum lot size"
                  placeholder="No min"
                  value={filters.lotSizeMin == null ? "" : String(filters.lotSizeMin)}
                  onChange={(v) => setFilter("lotSizeMin", v)}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-[var(--green)] h-4 w-4"
                  checked={filters.nearTransitOnly}
                  onChange={(e) => setFilter("nearTransitOnly", e.target.checked)}
                />
                <span className="text-sm">Near frequent transit</span>
              </label>
              <div className="space-y-2">
                <p className="pa-eyebrow" style={{ color: "var(--slate)" }}>
                  Max days on market
                </p>
                <NumInput
                  aria-label="Maximum days on market"
                  placeholder="Any"
                  value={filters.domMax == null ? "" : String(filters.domMax)}
                  onChange={(v) => setFilter("domMax", v)}
                />
              </div>
              <p className="text-xs" style={{ color: "var(--slate)" }}>
                Displacement overlay — coming soon.
              </p>
            </div>
          )}
        </FilterPopover>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2 pl-2">
          <button
            type="button"
            className="pa-btn pa-btn-sm whitespace-nowrap"
            onClick={saveSearch}
            style={searchSaved ? { color: "var(--green)", borderColor: "var(--green)" } : undefined}
          >
            {searchSaved ? <Check size={14} aria-hidden /> : <BellPlus size={14} aria-hidden />}
            {searchSaved ? "Search saved" : "Save search"}
          </button>
          {active > 0 && (
            <button
              type="button"
              className="flex items-center gap-1 text-xs whitespace-nowrap"
              style={{ color: "var(--slate)" }}
              onClick={resetFilters}
            >
              <span className="pa-mono">{active}</span> filter{active === 1 ? "" : "s"} applied
              <RotateCcw size={13} aria-hidden /> Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  placeholder,
  ...rest
}: {
  value: string;
  onChange: (v: number | null) => void;
  placeholder?: string;
  "aria-label": string;
}) {
  return (
    <input
      {...rest}
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, "");
        onChange(raw === "" ? null : Number(raw));
      }}
      className="w-full rounded-[6px] border bg-[var(--card)] px-2.5 py-1.5 text-sm pa-mono"
      style={{ borderColor: "var(--hairline)" }}
    />
  );
}

function CheckChip({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className={`pa-chip ${checked ? "pa-chip-active" : ""} justify-center`}
    >
      {checked ? <Check size={13} aria-hidden /> : null}
      {label}
    </button>
  );
}
