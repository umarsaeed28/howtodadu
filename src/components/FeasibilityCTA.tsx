"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { pushRecentAddress } from "@/lib/recent-addresses";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";

export function FeasibilityCTA() {
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
    <section id="feasibility" className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-[#786fa6]/5 via-white to-[#f8a5c2]/5 p-10 md:p-14 shadow-lg shadow-[#786fa6]/5">
          <div className="flex items-start gap-4 mb-8">
            <div className="size-12 rounded-xl bg-[#786fa6]/10 text-[#786fa6] flex items-center justify-center shrink-0">
              <MapPin className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#786fa6] uppercase tracking-wider mb-1">
                Feasibility tool
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-2">
                Check any Seattle address
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-xl">
                Get an instant read on zoning, lot size, coverage, and DADU potential.
                Useful before you invest time or money.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-2xl">
            <div className="flex-1">
              <AddressAutocomplete
                id="home-address"
                value={address}
                onChange={setAddress}
                placeholder="Enter a Seattle address…"
              />
            </div>
            <Button
              type="submit"
              disabled={!address.trim()}
              className="gap-2 h-12 px-8 shrink-0 rounded-full bg-[#786fa6] hover:bg-[#6b5d8a] text-white font-semibold shadow-md shadow-[#786fa6]/20"
            >
              <Search className="size-5" />
              Check
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-2">
            Powered by Seattle City GIS · Informational only
          </p>
        </div>
      </div>
    </section>
  );
}
