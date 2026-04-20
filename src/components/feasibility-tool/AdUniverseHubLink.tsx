"use client";

import { ExternalLink } from "lucide-react";

const ADUNIVERSE_FEASIBILITY_URL =
  "https://aduniverse-seattlecitygis.hub.arcgis.com/pages/feasibility";

export function AdUniverseHubLink() {
  return (
    <aside className="rounded-xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm md:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Official city tool
          </p>
          <p className="mt-1 text-sm text-zinc-700">
            <a
              href={ADUNIVERSE_FEASIBILITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-[var(--feasibility-accent,#0d9488)] underline-offset-2 hover:underline"
            >
              ADUniverse feasibility
              <ExternalLink className="size-3.5 shrink-0 opacity-80" aria-hidden />
            </a>{" "}
            — Seattle’s map and narrative for the same GIS layers (parcels + feasibility factors) this
            workspace uses. Use it to verify any property in the city’s interface.
          </p>
        </div>
      </div>
    </aside>
  );
}
