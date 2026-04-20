"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Table2 } from "lucide-react";
import {
  postBulkFeasibility,
  type BulkFeasibilityRow,
} from "@/lib/feasibility-bulk";
import { parseAddressesFromCsvText } from "@/lib/parse-csv-addresses";

const MAX_ROWS = 30;

export function BulkFeasibilityPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<BulkFeasibilityRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const runBulk = useCallback(async (addresses: string[]) => {
    if (addresses.length === 0) {
      setError("Add at least one Seattle address.");
      return;
    }
    if (addresses.length > MAX_ROWS) {
      setError(`Maximum ${MAX_ROWS} addresses per upload.`);
      return;
    }
    setLoading(true);
    setError("");
    setRows(null);
    try {
      const { rows: out } = await postBulkFeasibility(addresses);
      setRows(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk run failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const onFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      const addresses = parseAddressesFromCsvText(text);
      await runBulk(addresses);
    },
    [runBulk]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files[0];
      if (f) void onFile(f);
    },
    [onFile]
  );

  const onPasteSubmit = useCallback(() => {
    const addresses = parseAddressesFromCsvText(pasteText);
    void runBulk(addresses);
  }, [pasteText, runBulk]);

  return (
    <div className="space-y-6">
      <div
        role="button"
        tabIndex={0}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragActive(false);
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`rounded-lg border border-dashed px-6 py-10 text-center transition-colors ${
          dragActive
            ? "border-[var(--primary)] bg-[var(--muted)]/80"
            : "border-[var(--border)] bg-[var(--card)]/60 hover:border-[var(--foreground)]/30"
        }`}
      >
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          id="bulk-csv-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
        <label
          htmlFor="bulk-csv-input"
          className="cursor-pointer flex flex-col items-center gap-3"
        >
          <FileUp className="size-8 text-[var(--muted-foreground)]" aria-hidden />
          <span className="text-sm text-[var(--foreground)]">
            Drop a CSV here, or{" "}
            <span className="underline underline-offset-2">choose a file</span>
          </span>
          <span className="text-xs text-[var(--aura-text-muted)] max-w-md">
            Include a column named <code className="text-[11px]">address</code>{" "}
            (or put one address per line). Up to {MAX_ROWS} Seattle properties.
          </span>
        </label>
      </div>

      <div>
        <label
          htmlFor="bulk-paste"
          className="text-xs uppercase tracking-wider text-[var(--aura-text-muted)] mb-2 block"
        >
          Or paste addresses
        </label>
        <textarea
          id="bulk-paste"
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={"7721 24th Ave NW, Seattle WA 98117\n1526 N 107th St, Seattle, WA, 98133"}
          rows={5}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/25"
        />
        <button
          type="button"
          disabled={loading || !pasteText.trim()}
          onClick={onPasteSubmit}
          className="mt-3 h-10 px-5 text-xs uppercase tracking-wider border border-[var(--border)] bg-transparent hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Running…
            </span>
          ) : (
            "Run bulk check"
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm text-left">
            <caption className="sr-only">Bulk feasibility results</caption>
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/80">
                <th className="px-3 py-2.5 font-medium">Address</th>
                <th className="px-3 py-2.5 font-medium">Result</th>
                <th className="px-3 py-2.5 font-medium">Score</th>
                <th className="px-3 py-2.5 font-medium">PIN</th>
                <th className="px-3 py-2.5 font-medium">Lot sqft</th>
                <th className="px-3 py-2.5 font-medium">Zoning</th>
                <th className="px-3 py-2.5 font-medium w-28"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.address}
                  className="border-b border-[var(--border)]/80 last:border-0"
                >
                  <td className="px-3 py-2.5 align-top max-w-[14rem]">
                    {r.address}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {r.ok ? (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        OK
                      </span>
                    ) : (
                      <span className="text-red-600 text-xs">{r.error}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top whitespace-nowrap">
                    {r.ok && r.confidence != null ? (
                      <>
                        {r.confidence}
                        {r.confidenceLabel && (
                          <span className="text-[var(--aura-text-muted)] text-xs block">
                            {r.confidenceLabel}
                          </span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top font-mono text-xs">
                    {r.pin ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {r.lotSqft != null ? r.lotSqft.toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs">
                    {r.zoning ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {r.ok && (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/feasibility?address=${encodeURIComponent(r.address)}`
                          )
                        }
                        className="text-xs text-[var(--primary)] underline underline-offset-2 hover:no-underline"
                      >
                        Full report
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows && rows.length === 0 && !loading && (
        <p className="text-sm text-[var(--aura-text-muted)] flex items-center gap-2">
          <Table2 className="size-4 shrink-0" aria-hidden />
          No rows returned.
        </p>
      )}
    </div>
  );
}
