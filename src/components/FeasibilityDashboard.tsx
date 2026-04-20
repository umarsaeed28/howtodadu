"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchFeasibility } from "@/lib/feasibility";
import { generateADUReport } from "@/lib/adu-analysis";
import { buildFeasibilityTableRow, type FeasibilityTableRow } from "@/lib/feasibility-table-model";
import {
  buildDashboardPropertySlim,
  type DashboardPropertySlim,
} from "@/lib/dashboard-normalize";
import { mergeDashboardSlims } from "@/lib/feasibility-bulk";
import { fetchBulkFeasibilityInChunks } from "@/lib/bulk-feasibility-client";
import { parseAddressesFromCsvText } from "@/lib/parse-csv-addresses";
import {
  applyDashboardFilters,
  paginate,
  sortDashboardRows,
  totalPages,
  type DashboardFilters,
  type SortKey,
} from "@/lib/dashboard-query";
import { useFavorites } from "@/hooks/useFavorites";
import { useFeasibilityContext } from "@/contexts/FeasibilityContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FilterToolbar } from "@/components/dashboard/FilterToolbar";
import { SummaryMetricsStrip } from "@/components/dashboard/SummaryMetricsStrip";
import { BulkResultsTable } from "@/components/dashboard/BulkResultsTable";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { ExpandablePropertyDetails } from "@/components/dashboard/ExpandablePropertyDetails";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { FeasibilityShareModal } from "@/components/feasibility-tool/FeasibilityShareModal";
import { AdUniverseHubLink } from "@/components/feasibility-tool/AdUniverseHubLink";
import { pushRecentAddress } from "@/lib/recent-addresses";

const SORT_ASC_FIRST: SortKey[] = ["address", "neighborhood", "zoning", "confidence", "status"];

export function FeasibilityDashboard() {
  const searchParams = useSearchParams();
  const { favorites } = useFavorites();

  const [rows, setRows] = useState<DashboardPropertySlim[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [bulkSource, setBulkSource] = useState<string[] | null>(null);

  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [singleAddress, setSingleAddress] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkPhase, setBulkPhase] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<FeasibilityTableRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  /** Full detail fetch cache — only for rows added via single-address search (never bulk CSV). */
  const detailCache = useRef<Map<string, FeasibilityTableRow>>(new Map());
  /** Row ids (`DashboardPropertySlim.id`) eligible for detail cache; bulk runs remove their addresses from this set. */
  const singleSearchDetailCacheIdsRef = useRef<Set<string>>(new Set());
  const expandedIdRef = useRef<string | null>(null);

  const [errorBanner, setErrorBanner] = useState("");
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    expandedIdRef.current = expandedId;
  }, [expandedId]);

  const favoritesSet = useMemo(
    () => new Set(favorites.map((f) => f.address.trim().toLowerCase())),
    [favorites]
  );

  const listFilters = useMemo(
    (): DashboardFilters => ({
      favoritesOnly,
      favoritesSet,
    }),
    [favoritesOnly, favoritesSet]
  );

  const filtered = useMemo(
    () => applyDashboardFilters(rows, listFilters),
    [rows, listFilters]
  );

  const sorted = useMemo(
    () => sortDashboardRows(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir]
  );

  const pageCount = totalPages(sorted.length, pageSize);

  useEffect(() => {
    if (page > 0 && page >= pageCount) {
      setPage(Math.max(0, pageCount - 1));
    }
  }, [page, pageCount]);

  const pageRows = useMemo(() => paginate(sorted, page, pageSize), [sorted, page, pageSize]);

  const kpis = useMemo(() => {
    const analyzed = filtered.filter((r) => r.status === "analyzed");
    const strong = filtered.filter((r) => r.confidenceBand === "strong").length;
    const medium = filtered.filter((r) => r.confidenceBand === "medium").length;
    const needsReview = filtered.filter((r) => r.confidenceBand === "needs_review").length;
    const low = filtered.filter((r) => r.confidenceBand === "low").length;
    const favorited = filtered.filter((r) => favoritesSet.has(r.address.trim().toLowerCase())).length;
    const lots = analyzed.map((r) => r.lotSizeSqft).filter((n): n is number => n != null && n > 0);
    const avgLot =
      lots.length > 0 ? Math.round(lots.reduce((a, b) => a + b, 0) / lots.length) : null;
    const scores = analyzed.map((r) => r.daduScore);
    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return {
      total: filtered.length,
      strong,
      medium,
      needsReview,
      low,
      favorited,
      avgLot,
      avgScore,
    };
  }, [filtered, favoritesSet]);

  const ctx = useFeasibilityContext();
  useEffect(() => {
    ctx?.setHasResults(rows.length > 0);
  }, [rows.length, ctx]);

  /** Load full feasibility row when a row expands (cached). */
  useEffect(() => {
    const id = expandedId;
    if (!id) {
      setDetailRow(null);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }
    const slim = sorted.find((r) => r.id === id);
    if (!slim) {
      setDetailRow(null);
      setDetailLoading(false);
      return;
    }
    if (slim.status === "failed") {
      setDetailRow(null);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }
    const cacheAllowed = singleSearchDetailCacheIdsRef.current.has(id);
    const cached = cacheAllowed ? detailCache.current.get(id) : undefined;
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
        if (cancelled || expandedIdRef.current !== id) return;
        const report =
          data.parcel || data.feasibility
            ? generateADUReport(data.parcel, data.feasibility)
            : null;
        if (!report) {
          throw new Error("No parcel or feasibility data returned.");
        }
        const row = buildFeasibilityTableRow(data, report);
        if (singleSearchDetailCacheIdsRef.current.has(id)) {
          detailCache.current.set(id, row);
        }
        if (expandedIdRef.current === id) {
          setDetailRow(row);
          setDetailLoading(false);
        }
      })
      .catch((e) => {
        if (cancelled || expandedIdRef.current !== id) return;
        setDetailError(e instanceof Error ? e.message : "Could not load details.");
        setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expandedId, sorted]);

  const runSingle = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) return;
    pushRecentAddress(q);
    setSingleLoading(true);
    setErrorBanner("");
    try {
      const data = await fetchFeasibility(q);
      const report =
        data.parcel || data.feasibility
          ? generateADUReport(data.parcel, data.feasibility)
          : null;
      if (!report) {
        setErrorBanner("No parcel or feasibility data returned for this address.");
        return;
      }
      const slim = buildDashboardPropertySlim(data, report);
      singleSearchDetailCacheIdsRef.current.add(slim.id);
      setRows((prev) => mergeDashboardSlims(prev, [slim], 5000));
      setLastUpdated(new Date().toISOString());
      setExpandedId(slim.id);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSingleLoading(false);
    }
  }, []);

  const prefillRan = useRef(false);
  useEffect(() => {
    const prefill = searchParams.get("address");
    if (!prefill || prefillRan.current) return;
    prefillRan.current = true;
    setSingleAddress(prefill);
    void runSingle(prefill);
  }, [searchParams, runSingle]);

  const favoritesViewSynced = useRef(false);
  useEffect(() => {
    if (favoritesViewSynced.current) return;
    if (searchParams.get("view") === "favorites") {
      setFavoritesOnly(true);
      favoritesViewSynced.current = true;
    }
  }, [searchParams]);

  const runBulk = useCallback(
    async (addresses: string[]) => {
      if (addresses.length === 0) {
        setErrorBanner("Add at least one Seattle address.");
        return;
      }
      setBulkLoading(true);
      setErrorBanner("");
      setBulkPhase("Preparing…");
      try {
        const { merged } = await fetchBulkFeasibilityInChunks(addresses, (p) => {
          setBulkPhase(p.phase);
        });
        for (const slim of merged) {
          singleSearchDetailCacheIdsRef.current.delete(slim.id);
          detailCache.current.delete(slim.id);
        }
        for (const a of addresses) {
          const id = a.trim().toLowerCase();
          singleSearchDetailCacheIdsRef.current.delete(id);
          detailCache.current.delete(id);
        }
        setBulkSource(addresses);
        setRows((prev) => mergeDashboardSlims(prev, merged, 5000));
        setLastUpdated(new Date().toISOString());
        setPage(0);
      } catch (e) {
        setErrorBanner(e instanceof Error ? e.message : "Bulk analysis failed");
      } finally {
        setBulkLoading(false);
        setBulkPhase("");
      }
    },
    []
  );

  const onBulkFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      const addresses = parseAddressesFromCsvText(text);
      await runBulk(addresses);
    },
    [runBulk]
  );

  const onBulkCsvText = useCallback(
    async (text: string) => {
      const addresses = parseAddressesFromCsvText(text);
      await runBulk(addresses);
    },
    [runBulk]
  );

  const onFavoritesOnlyChange = useCallback((only: boolean) => {
    setFavoritesOnly(only);
    setPage(0);
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(SORT_ASC_FIRST.includes(key) ? "asc" : "desc");
      return key;
    });
    setPage(0);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const refreshWorkspace = useCallback(() => {
    if (bulkSource?.length) {
      void runBulk(bulkSource);
    }
  }, [bulkSource, runBulk]);

  const shareAddresses = useMemo(() => {
    if (favoritesOnly) {
      return favorites.map((f) => f.address);
    }
    return pageRows[0]?.address ? [pageRows[0].address] : sorted[0]?.address ? [sorted[0].address] : [];
  }, [favoritesOnly, favorites, pageRows, sorted]);

  const renderExpanded = useCallback(
    (slim: DashboardPropertySlim) => {
      return (
        <ExpandablePropertyDetails
          slim={slim}
          detailRow={expandedId === slim.id ? detailRow : null}
          loading={expandedId === slim.id && detailLoading}
          error={expandedId === slim.id ? detailError : null}
        />
      );
    },
    [expandedId, detailRow, detailLoading, detailError]
  );

  const showTableSkeleton = bulkLoading && rows.length === 0;

  return (
    <section
      className="relative mx-auto max-w-[min(1600px,100%)] px-4 py-8 md:px-8 md:py-12"
      style={{ ["--feasibility-accent" as never]: "#0d9488" }}
    >
      <div className="space-y-6">
        <DashboardHeader
          title="DADU feasibility"
          totalProperties={rows.length}
          lastUpdatedIso={lastUpdated}
          onRefresh={bulkSource?.length ? refreshWorkspace : undefined}
          onShare={() => setShareOpen(true)}
          refreshing={bulkLoading}
        />

        <AdUniverseHubLink />

        <FilterToolbar
          favoritesOnly={favoritesOnly}
          onFavoritesOnlyChange={onFavoritesOnlyChange}
          singleAddress={singleAddress}
          onSingleAddressChange={setSingleAddress}
          onSingleAnalyze={() => void runSingle(singleAddress)}
          singleLoading={singleLoading}
          onBulkFile={(f) => void onBulkFile(f)}
          onBulkCsvText={(t) => void onBulkCsvText(t)}
          bulkLoading={bulkLoading}
          bulkPhase={bulkPhase}
          disabled={bulkLoading}
        />

        {errorBanner ? <ErrorState message={errorBanner} /> : null}

        <SummaryMetricsStrip
          total={kpis.total}
          strongConfidence={kpis.strong}
          mediumConfidence={kpis.medium}
          needsReview={kpis.needsReview}
          lowConfidence={kpis.low}
          favorited={kpis.favorited}
          avgLot={kpis.avgLot}
          avgScore={kpis.avgScore}
          loading={bulkLoading && rows.length === 0}
        />

        {showTableSkeleton ? (
          <TableSkeleton rows={10} />
        ) : (
          <BulkResultsTable
            rows={pageRows}
            expandedRowId={expandedId}
            onToggleExpand={toggleExpand}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            loading={false}
            renderExpanded={renderExpanded}
          />
        )}

        {!showTableSkeleton && sorted.length > 0 ? (
          <TablePagination
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            totalItems={sorted.length}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(0);
            }}
            disabled={bulkLoading}
          />
        ) : null}

        <p className="text-xs leading-relaxed text-zinc-500">
          Assessed value is shown until MLS integration. Building sq ft reflects city records where
          available, not finished interior space. Preliminary GIS only—not a permit or legal opinion.
        </p>
      </div>

      <FeasibilityShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        addresses={shareAddresses}
        title={favoritesOnly ? "Share favorites" : "Share"}
      />
    </section>
  );
}
