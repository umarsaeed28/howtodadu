import type { Metadata } from "next";
import InvestFeed from "@/components/invest/InvestFeed";
import InvestCompliance from "@/components/invest/InvestCompliance";
import { sourceLabel } from "@/components/invest/format";
import { getInvestFeed } from "@/lib/server/invest";
import { updatedLabel, watchedIds } from "@/lib/server/invest-view";

export const metadata: Metadata = {
  title: "Current opportunities — Pencil",
  description: "Seattle listings where a DADU pencils: cash-on-cash ROI, cash required and DADU potential for each, updated daily.",
};
export const dynamic = "force-dynamic";

export default async function InvestPage() {
  const [feed, watch] = await Promise.all([getInvestFeed(), watchedIds()]);
  return (
    <main className="pencil-app">
      <div className="iv-page">
        <header className="iv-head">
          <h1 className="pa-display iv-h1">Current Opportunities</h1>
          <p className="iv-sub">Every day we run new Seattle listings through our feasibility engine and surface the lots with the strongest DADU upside.</p>
          <p className="iv-updated">{updatedLabel(feed.generatedAt)}</p>
        </header>
        <InvestFeed opportunities={feed.opportunities} source={feed.source} signedIn={watch.signedIn} watched={watch.ids} />
        <InvestCompliance source={sourceLabel(feed.source)} />
      </div>
    </main>
  );
}
