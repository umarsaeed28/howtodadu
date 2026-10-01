"use client";

import { SearchX } from "lucide-react";

export function NoSearchResults() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--paper)", color: "var(--slate)" }}
      >
        <SearchX size={22} aria-hidden />
      </span>
      <h2 className="pa-display text-lg">Nothing matches that search</h2>
      <p className="mt-1 max-w-xs text-sm" style={{ color: "var(--slate)" }}>
        Try a Seattle neighborhood, address, or ZIP.
      </p>
    </div>
  );
}
