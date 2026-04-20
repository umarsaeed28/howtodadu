"use client";

import { useRef, useState } from "react";
import { ClipboardPaste, FileUp, Loader2, Search } from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

interface FilterToolbarProps {
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (only: boolean) => void;
  singleAddress: string;
  onSingleAddressChange: (v: string) => void;
  onSingleAnalyze: () => void;
  singleLoading: boolean;
  onBulkFile: (file: File) => void;
  /** Raw CSV / TSV text or one address per line (same parser as file upload). */
  onBulkCsvText: (text: string) => void;
  bulkLoading: boolean;
  bulkPhase: string;
  disabled?: boolean;
}

export function FilterToolbar({
  favoritesOnly,
  onFavoritesOnlyChange,
  singleAddress,
  onSingleAddressChange,
  onSingleAnalyze,
  singleLoading,
  onBulkFile,
  onBulkCsvText,
  bulkLoading,
  bulkPhase,
  disabled,
}: FilterToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState("");

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <label htmlFor="dash-address" className="text-xs font-medium text-zinc-500">
            Add property
          </label>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <AddressAutocomplete
                id="dash-address"
                value={singleAddress}
                onChange={onSingleAddressChange}
                placeholder="Seattle address…"
                variant="terra"
              />
            </div>
            <button
              type="button"
              disabled={disabled || singleLoading || !singleAddress.trim()}
              onClick={onSingleAnalyze}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--feasibility-accent,#0d9488)] px-5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--feasibility-accent,#0d9488)]"
            >
              {singleLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Analyzing
                </>
              ) : (
                <>
                  <Search className="size-4" aria-hidden />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onBulkFile(f);
          e.target.value = "";
        }}
      />
      <div className="space-y-3 border-t border-zinc-100 pt-4">
        <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || bulkLoading}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 hover:border-zinc-300 disabled:opacity-50"
        >
          {bulkLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {bulkPhase || "Analyzing…"}
            </>
          ) : (
            <>
              <FileUp className="size-4" aria-hidden />
              CSV upload
            </>
          )}
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onFavoritesOnlyChange(false)}
            className={`h-9 rounded-lg px-3 text-sm font-medium ${
              !favoritesOnly ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onFavoritesOnlyChange(true)}
            className={`h-9 rounded-lg px-3 text-sm font-medium ${
              favoritesOnly ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Favorites
          </button>
        </div>
        </div>

        <div
          className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 p-3"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={async (e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (!f) return;
            try {
              const text = await f.text();
              setPasteText(text);
            } catch {
              /* ignore */
            }
          }}
        >
          <label htmlFor="dash-paste-csv" className="flex items-center gap-2 text-xs font-medium text-zinc-600">
            <ClipboardPaste className="size-3.5 shrink-0" aria-hidden />
            Paste or drop CSV / addresses
          </label>
          <textarea
            id="dash-paste-csv"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={
              "address\n123 Main St, Seattle, WA\n456 Oak Ave, Seattle, WA 98103\n…or paste full CSV with an address column"
            }
            rows={4}
            disabled={disabled || bulkLoading}
            className="mt-2 w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--feasibility-accent,#0d9488)] disabled:opacity-50"
            spellCheck={false}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={disabled || bulkLoading || !pasteText.trim()}
              onClick={() => {
                onBulkCsvText(pasteText);
                setPasteText("");
              }}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {bulkPhase || "Analyzing…"}
                </>
              ) : (
                <>
                  <ClipboardPaste className="size-4" aria-hidden />
                  Analyze pasted list
                </>
              )}
            </button>
            <span className="text-xs text-zinc-500">
              Same parser as file upload; you can also drop a .csv file here.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
