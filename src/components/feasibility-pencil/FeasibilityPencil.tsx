"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { fetchFeasibility } from "@/lib/feasibility";
import { generateADUReport } from "@/lib/adu-analysis";
import { buildFeasibilityTableRow, type FeasibilityTableRow } from "@/lib/feasibility-table-model";
import { buildDashboardPropertySlim, type DashboardPropertySlim } from "@/lib/dashboard-normalize";
import { mergeDashboardSlims } from "@/lib/feasibility-bulk";
import { fetchBulkFeasibilityInChunks } from "@/lib/bulk-feasibility-client";
import { parseAddressesFromCsvText } from "@/lib/parse-csv-addresses";
import { pushRecentAddress } from "@/lib/recent-addresses";
import { useFavorites } from "@/hooks/useFavorites";
import type { Verdict } from "@/lib/parcels";
import { verdictFromScore } from "@/lib/feasibility-verdict";
import FeasAppBar from "./FeasAppBar";
import FeasFilterBar from "./FeasFilterBar";
import FeasCard from "./FeasCard";
import FeasDetailModal from "./FeasDetailModal";
import { ResultsSkeleton, NoSearchResults } from "@/components/pencil-app/states";
import type { FeasSortKey } from "./types";

const PAGE = 24;

export default function FeasibilityPencil() {
  const searchParams = useSearchParams();
  const { favorites, toggle: toggleFavorite } = useFavorites();

  const [rows, setRows] = useState<DashboardPropertySlim[]>([]);
  const [singleAddress, setSingleAddress] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkPhase, setBulkPhase] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  const [pencilsOnly, setPencilsOnly] = useState(false);
  const [verdicts, setVerdicts] = useState<Set<Verdict>>(new Set());
  const [zonings, setZonings] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<FeasSortKey>("score");
  const [visible, setVisible] = useState(PAGE);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<FeasibilityTableRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailCache = useRef<Map<string, FeasibilityTableRow>>(new Map());
  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const favoritesSet = useMemo(
    () => new Set(favorites.map((f) => f.address.trim().toLowerCase())),
    [favorites]
  );

  const zoningOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.status === "analyzed" && r.zoning) set.add(r.zoning);
    }
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (favoritesOnly && !favoritesSet.has(r.address.trim().toLowerCase())) return false;
      const v = r.status === "analyzed" ? verdictFromScore(r.daduScore) : "NO";
      if (pencilsOnly && v !== "PENCILS") return false;
      if (!pencilsOnly && verdicts.size > 0 && !verdicts.has(v)) return false;
      if (zonings.size > 0 && !(r.zoning && zonings.has(r.zoning))) return false;
      return true;
    });
  }, [rows, favoritesOnly, favoritesSet, pencilsOnly, verdicts, zonings]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (sort) {
        case "lot":
          return (b.lotSizeSqft ?? -1) - (a.lotSizeSqft ?? -1);
        case "az":
          return a.streetLine.localeCompare(b.streetLine);
        case "newest":
          return b.analyzedAtIso.localeCompare(a.analyzedAtIso);
        case "score":
        default:
          return b.daduScore - a.daduScore;
      }
    });
    return arr;
  }, [filtered, sort]);

  useEffect(() => {
    setVisible(PAGE);
  }, [pencilsOnly, verdicts, zonings, favoritesOnly, sort]);

  const pageRows = sorted.slice(0, visible);
  const selectedSlim = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId]
  );

  /* ---- detail fetch on open ---- */
  useEffect(() => {
    const id = selectedId;
    if (!id) {
      setDetailRow(null);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }
    const slim = rows.find((r) => r.id === id);
    if (!slim || slim.status === "failed") {
      setDetailRow(null);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }
    const cached = detailCache.current.get(id);
    if (cached) {
      setDetailRow(cached);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailRow(null);
    setDetailLoading(true);
    setDetailError(null);
    void fetchFeasibility(slim.address)
      .then((data) => {
        if (cancelled || selectedIdRef.current !== id) return;
        const report =
          data.parcel || data.feasibility ? generateADUReport(data.parcel, data.feasibility) : null;
        if (!report) throw new Error("No parcel or feasibility data returned.");
        const row = buildFeasibilityTableRow(data, report);
        detailCache.current.set(id, row);
        if (selectedIdRef.current === id) {
          setDetailRow(row);
          setDetailLoading(false);
        }
      })
      .catch((e) => {
        if (cancelled || selectedIdRef.current !== id) return;
        setDetailError(e instanceof Error ? e.message : "Could not load details.");
        setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, rows]);

  /* ---- single search ---- */
  const runSingle = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) return;
    pushRecentAddress(q);
    setSingleLoading(true);
    setErrorBanner("");
    try {
      const data = await fetchFeasibility(q);
      const report =
        data.parcel || data.feasibility ? generateADUReport(data.parcel, data.feasibility) : null;
      if (!report) {
        setErrorBanner("No parcel or feasibility data returned for this address.");
        return;
      }
      const slim = buildDashboardPropertySlim(data, report);
      const full = buildFeasibilityTableRow(data, report);
      detailCache.current.set(slim.id, full);
      setRows((prev) => mergeDashboardSlims(prev, [slim], 5000));
      setSelectedId(slim.id);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSingleLoading(false);
    }
  }, []);

  /* ---- bulk csv ---- */
  const runBulk = useCallback(async (addresses: string[]) => {
    if (addresses.length === 0) {
      setErrorBanner("Add at least one Seattle address.");
      return;
    }
    setBulkLoading(true);
    setErrorBanner("");
    setBulkPhase("Preparing…");
    try {
      const { merged } = await fetchBulkFeasibilityInChunks(addresses, (p) => setBulkPhase(p.phase));
      for (const slim of merged) detailCache.current.delete(slim.id);
      setRows((prev) => mergeDashboardSlims(prev, merged, 5000));
    } catch (e) {
      setErrorBanner(e instanceof Error ? e.message : "Bulk analysis failed.");
    } finally {
      setBulkLoading(false);
      setBulkPhase("");
    }
  }, []);

  const onCsvFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      await runBulk(parseAddressesFromCsvText(text));
    },
    [runBulk]
  );

  /* ---- url prefill ---- */
  const prefillRan = useRef(false);
  useEffect(() => {
    const prefill = searchParams.get("address");
    if (prefill && !prefillRan.current) {
      prefillRan.current = true;
      setSingleAddress(prefill);
      void runSingle(prefill);
    }
    if (searchParams.get("view") === "favorites") {
      setFavoritesOnly(true);
    }
  }, [searchParams, runSingle]);

  const toggleVerdict = useCallback((v: Verdict) => {
    setVerdicts((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }, []);

  const toggleZoning = useCallback((z: string) => {
    setZonings((prev) => {
      const next = new Set(prev);
      if (next.has(z)) next.delete(z);
      else next.add(z);
      return next;
    });
  }, []);

  const showSkeleton = (singleLoading || bulkLoading) && rows.length === 0;
  const empty = rows.length === 0 && !showSkeleton;

  return (
    <div className="flex min-h-screen flex-col">
      <FeasAppBar
        value={singleAddress}
        onChange={setSingleAddress}
        onSubmit={(address) => {
          setSingleAddress(address);
          void runSingle(address);
        }}
        loading={singleLoading}
      />

      <FeasFilterBar
        count={filtered.length}
        pencilsOnly={pencilsOnly}
        onTogglePencils={() => setPencilsOnly((p) => !p)}
        verdicts={verdicts}
        onToggleVerdict={toggleVerdict}
        zoningOptions={zoningOptions}
        zonings={zonings}
        onToggleZoning={toggleZoning}
        onClearZoning={() => setZonings(new Set())}
        favoritesOnly={favoritesOnly}
        onToggleFavorites={() => setFavoritesOnly((f) => !f)}
        sort={sort}
        onSort={setSort}
        onCsvFile={(f) => void onCsvFile(f)}
        busy={bulkLoading}
      />

      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 md:px-6">
        {errorBanner && (
          <div
            className="mb-4 rounded-[8px] border px-4 py-3 text-sm"
            style={{ background: "var(--red-tint)", borderColor: "var(--red)", color: "var(--red)" }}
            role="alert"
          >
            {errorBanner}
          </div>
        )}

        {bulkLoading && bulkPhase && (
          <p className="pa-mono mb-4 flex items-center gap-2 text-xs" style={{ color: "var(--slate)" }}>
            <Loader2 size={13} className="animate-spin" aria-hidden /> {bulkPhase}
          </p>
        )}

        {showSkeleton ? (
          <ResultsSkeleton />
        ) : empty ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <h1 className="pa-display text-2xl" style={{ color: "var(--ink)" }}>
              Check a Seattle address.
            </h1>
            <p className="mt-2 max-w-md text-sm" style={{ color: "var(--slate)" }}>
              Get an early read on what a lot can become. Search one address, or upload a CSV to
              screen many at once.
            </p>
            <button
              type="button"
              className="pa-btn pa-btn-primary mt-5"
              onClick={() => {
                setSingleAddress("4214 NW 62nd St, Seattle");
                void runSingle("4214 NW 62nd St, Seattle");
              }}
            >
              Try a sample address
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <NoSearchResults />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pageRows.map((slim) => (
                <FeasCard
                  key={slim.id}
                  slim={slim}
                  favorite={favoritesSet.has(slim.address.trim().toLowerCase())}
                  onToggleFavorite={() => toggleFavorite(slim.address)}
                  onOpen={() => setSelectedId(slim.id)}
                />
              ))}
            </div>

            {visible < sorted.length && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  className="pa-btn"
                  onClick={() => setVisible((v) => v + PAGE)}
                >
                  Show more ({sorted.length - visible} left)
                </button>
              </div>
            )}

            <p className="mt-8 text-xs leading-relaxed" style={{ color: "var(--slate)" }}>
              Preliminary GIS estimate, not a permit or legal opinion. Assessed value shown until MLS
              is integrated. We confirm everything before any acquisition.
            </p>
          </>
        )}
      </main>

      {selectedSlim && (
        <FeasDetailModal
          slim={selectedSlim}
          detailRow={detailRow}
          loading={detailLoading}
          error={detailError}
          favorite={favoritesSet.has(selectedSlim.address.trim().toLowerCase())}
          onToggleFavorite={() => toggleFavorite(selectedSlim.address)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
