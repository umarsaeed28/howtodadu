"use client";

interface DashboardHeaderProps {
  title?: string;
  totalProperties: number;
  lastUpdatedIso: string | null;
  onRefresh?: () => void;
  onShare?: () => void;
  refreshing?: boolean;
}

export function DashboardHeader({
  title = "DADU feasibility",
  totalProperties,
  lastUpdatedIso,
  onRefresh,
  onShare,
  refreshing,
}: DashboardHeaderProps) {
  const formatted =
    lastUpdatedIso != null
      ? new Date(lastUpdatedIso).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  return (
    <header className="flex flex-col gap-4 border-b border-zinc-200/90 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Seattle · Bulk analysis</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
          {title}
        </h1>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600">
          <span>
            <span className="text-zinc-500">Properties in workspace </span>
            <strong className="font-semibold tabular-nums text-zinc-900">{totalProperties.toLocaleString()}</strong>
          </span>
          <span>
            <span className="text-zinc-500">Last updated </span>
            <time dateTime={lastUpdatedIso ?? undefined}>{formatted}</time>
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 hover:border-[var(--feasibility-accent,#0d9488)] hover:text-[var(--feasibility-accent,#0d9488)] disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh view"}
          </button>
        ) : null}
        {onShare ? (
          <button
            type="button"
            onClick={onShare}
            className="h-10 rounded-lg bg-[var(--feasibility-accent,#0d9488)] px-4 text-sm font-medium text-white hover:opacity-90"
          >
            Share
          </button>
        ) : null}
      </div>
    </header>
  );
}
