"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { type FeasibilityResult, fetchFeasibility } from "@/lib/feasibility";
import { generateADUReport, type ADUReport } from "@/lib/adu-analysis";
import { Loader2, Search } from "lucide-react";
import { DealScreeningResults } from "@/components/deal-screening";
import { FavoritesList } from "@/components/FavoritesList";
import { useFeasibilityContext } from "@/contexts/FeasibilityContext";

const LOADING_STAGES = [
  "Locating parcel…",
  "Gathering feasibility data…",
  "Analyzing terrain and context…",
  "Calculating deal score…",
  "Preparing visual summary…",
];

export function FeasibilityClient() {
  const searchParams = useSearchParams();
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<FeasibilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState("");

  const runSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setAddress(query);
    setLoading(true);
    setError("");
    setResult(null);
    setLoadingStage(0);
    try {
      setLoadingStage(1);
      const data = await fetchFeasibility(query);
      setLoadingStage(4);
      await new Promise((r) => setTimeout(r, 300));
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) return;
    let idx = 0;
    const t = setInterval(() => {
      idx += 1;
      setLoadingStage((s) => Math.min(s + 1, LOADING_STAGES.length - 1));
      if (idx >= LOADING_STAGES.length - 1) clearInterval(t);
    }, 450);
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => {
    const prefill = searchParams.get("address");
    if (prefill) runSearch(prefill);
  }, [searchParams, runSearch]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    runSearch(address);
  }

  const report: ADUReport | null =
    result && (result.parcel || result.feasibility)
      ? generateADUReport(result.parcel, result.feasibility)
      : null;

  const ctx = useFeasibilityContext();
  useEffect(() => {
    ctx?.setHasResults(!!(report && result));
  }, [report, result, ctx]);

  if (report && result) {
    return <DealScreeningResults result={result} report={report} />;
  }

  return (
    <section className="relative py-16 md:py-24 overflow-hidden max-w-4xl mx-auto px-6 md:px-12">
      <span className="label mb-4">Seattle DADU Feasibility</span>
      <h1 className="font-display text-3xl md:text-4xl font-normal tracking-tight text-[var(--foreground)] mb-4">
        Check a property&apos;s DADU feasibility
      </h1>
      <p className="text-base text-[var(--aura-text-muted)] leading-relaxed max-w-xl mb-10">
        Enter a Seattle address to see confidence score, property details, potential
        DADU size, GIS-powered site insights, and key risks.
      </p>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 max-w-2xl">
        <div className="flex-1">
          <AddressAutocomplete
            id="feasibility-address"
            value={address}
            onChange={setAddress}
            placeholder="Enter a Seattle address…"
            variant="terra"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="h-12 px-8 shrink-0 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border border-[var(--border)] text-[var(--foreground)] text-xs uppercase tracking-wider hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span>{LOADING_STAGES[loadingStage] ?? "Preparing…"}</span>
            </>
          ) : (
            <>
              <Search className="size-4" aria-hidden />
              Check
            </>
          )}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <p className="text-[11px] text-[var(--aura-text-muted)] mt-4">
        Data from Seattle City GIS. Informational only.
      </p>
      <FavoritesList onSelectAddress={runSearch} variant="terra" />
    </section>
  );
}
