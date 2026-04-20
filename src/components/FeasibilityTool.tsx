"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { pushRecentAddress } from "@/lib/recent-addresses";
import { Search } from "lucide-react";

export function FeasibilityTool() {
  const [address, setAddress] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const a = address.trim();
    if (!a) return;
    pushRecentAddress(a);
    router.push(`/feasibility?address=${encodeURIComponent(a)}`);
  }

  return (
    <section id="feasibility" className="py-20 md:py-28 border-t border-[var(--border)]" aria-labelledby="feasibility-heading">
      <div className="mx-auto max-w-4xl px-6 md:px-12">
        <h2 id="feasibility-heading" className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-[var(--foreground)] mb-4">
          Check the Potential of a Property
        </h2>
        <p className="text-[var(--muted-foreground)] leading-relaxed max-w-2xl mb-10">
          Enter an address or neighborhood to get an early preview of middle housing possibilities.
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-4 max-w-xl mb-8"
          aria-label="Property feasibility search"
        >
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
            disabled={!address.trim()}
            className="gap-2 h-12 px-8 shrink-0 bg-transparent border border-[var(--border)] text-[var(--foreground)] font-medium text-xs uppercase tracking-wider hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors disabled:opacity-50 flex items-center justify-center"
            aria-label="Start feasibility check"
          >
            <Search className="size-4" aria-hidden />
            Start Feasibility Check
          </button>
        </form>

        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-2xl">
          This tool provides preliminary insights based on publicly available data and Seattle resources such as ADUniverse. Results are not a final determination and should be verified through professional review.
        </p>
      </div>
    </section>
  );
}
