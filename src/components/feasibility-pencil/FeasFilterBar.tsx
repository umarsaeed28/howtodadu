"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Upload, Star } from "lucide-react";
import FilterPopover from "@/components/pencil-app/FilterPopover";
import type { Verdict } from "@/lib/parcels";
import type { FeasSortKey } from "./types";

const VERDICTS: { key: Verdict; label: string }[] = [
  { key: "PENCILS", label: "Pencils" },
  { key: "TIGHT", label: "Tight" },
  { key: "NO", label: "No" },
];

const SORTS: { key: FeasSortKey; label: string }[] = [
  { key: "score", label: "Highest score" },
  { key: "lot", label: "Largest lot" },
  { key: "az", label: "Address A–Z" },
  { key: "newest", label: "Newest" },
];

function SortMenu({ sort, onSort }: { sort: FeasSortKey; onSort: (k: FeasSortKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const current = SORTS.find((s) => s.key === sort)?.label;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="pa-btn pa-btn-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ color: "var(--slate)" }}>Sort:</span> {current}
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Sort results"
          className="pa-card absolute right-0 z-40 mt-2 w-48 overflow-hidden p-1"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          {SORTS.map((o) => (
            <li key={o.key}>
              <button
                type="button"
                role="option"
                aria-selected={o.key === sort}
                className="flex w-full items-center justify-between rounded-[5px] px-2.5 py-2 text-left text-sm hover:bg-[var(--paper)]"
                onClick={() => {
                  onSort(o.key);
                  setOpen(false);
                }}
              >
                {o.label}
                {o.key === sort && <Check size={15} aria-hidden style={{ color: "var(--green)" }} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-[5px] px-1.5 py-2 hover:bg-[var(--paper)]">
      <span
        className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border"
        style={{
          borderColor: checked ? "var(--green)" : "var(--hairline)",
          background: checked ? "var(--green)" : "transparent",
        }}
      >
        {checked && <Check size={12} strokeWidth={3} color="#fff" aria-hidden />}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export default function FeasFilterBar({
  count,
  pencilsOnly,
  onTogglePencils,
  verdicts,
  onToggleVerdict,
  zoningOptions,
  zonings,
  onToggleZoning,
  onClearZoning,
  favoritesOnly,
  onToggleFavorites,
  sort,
  onSort,
  onCsvFile,
  busy,
}: {
  count: number;
  pencilsOnly: boolean;
  onTogglePencils: () => void;
  verdicts: Set<Verdict>;
  onToggleVerdict: (v: Verdict) => void;
  zoningOptions: string[];
  zonings: Set<string>;
  onToggleZoning: (z: string) => void;
  onClearZoning: () => void;
  favoritesOnly: boolean;
  onToggleFavorites: () => void;
  sort: FeasSortKey;
  onSort: (k: FeasSortKey) => void;
  onCsvFile: (file: File) => void;
  busy: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="z-30 border-b md:sticky md:top-[69px]"
      style={{ background: "var(--card)", borderColor: "var(--hairline)" }}
    >
      <div className="mx-auto flex max-w-[1500px] items-center gap-2 overflow-x-auto px-4 py-2.5 md:px-6">
        <button
          type="button"
          className={`pa-chip ${pencilsOnly ? "pa-chip-active" : ""}`}
          aria-pressed={pencilsOnly}
          onClick={onTogglePencils}
        >
          Pencils only
        </button>

        <FilterPopover
          label="Verdict"
          active={verdicts.size > 0}
          summary={verdicts.size > 0 ? `Verdict · ${verdicts.size}` : null}
        >
          {() => (
            <div>
              <p className="pa-eyebrow mb-2" style={{ color: "var(--slate)" }}>
                Verdict
              </p>
              {VERDICTS.map((v) => (
                <CheckRow
                  key={v.key}
                  label={v.label}
                  checked={verdicts.has(v.key)}
                  onChange={() => onToggleVerdict(v.key)}
                />
              ))}
            </div>
          )}
        </FilterPopover>

        <FilterPopover
          label="Zoning"
          active={zonings.size > 0}
          summary={zonings.size > 0 ? `Zoning · ${zonings.size}` : null}
          width={240}
        >
          {() => (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="pa-eyebrow" style={{ color: "var(--slate)" }}>
                  Zoning
                </p>
                {zonings.size > 0 && (
                  <button
                    type="button"
                    className="text-xs"
                    style={{ color: "var(--green)" }}
                    onClick={onClearZoning}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto pa-scroll">
                {zoningOptions.length === 0 ? (
                  <p className="px-1.5 py-2 text-sm" style={{ color: "var(--slate)" }}>
                    No zoning yet. Check an address.
                  </p>
                ) : (
                  zoningOptions.map((z) => (
                    <CheckRow
                      key={z}
                      label={z}
                      checked={zonings.has(z)}
                      onChange={() => onToggleZoning(z)}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </FilterPopover>

        <button
          type="button"
          className={`pa-chip ${favoritesOnly ? "pa-chip-active" : ""}`}
          aria-pressed={favoritesOnly}
          onClick={onToggleFavorites}
        >
          <Star size={14} aria-hidden fill={favoritesOnly ? "var(--green)" : "none"} />
          Saved
        </button>

        <button
          type="button"
          className="pa-chip"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <Upload size={14} aria-hidden />
          Upload CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onCsvFile(f);
            e.target.value = "";
          }}
        />

        <div className="ml-auto flex items-center gap-3 pl-3">
          <span className="pa-mono hidden text-xs sm:inline" style={{ color: "var(--slate)" }}>
            {count} {count === 1 ? "property" : "properties"}
          </span>
          <SortMenu sort={sort} onSort={onSort} />
        </div>
      </div>
    </div>
  );
}
