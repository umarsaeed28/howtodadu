import type { Metadata } from "next";
import PortalFrame from "@/components/portal/PortalFrame";
import InvestSettingsForm from "@/components/invest/InvestSettingsForm";
import { envState, requireAdmin } from "@/lib/admin/server";
import EnvBar from "@/components/admin/EnvBar";
import { getInvestAssumptions } from "@/lib/server/invest";

export const metadata: Metadata = { title: "Invest settings — Pencil admin" };
export const dynamic = "force-dynamic";

/** The cost assumptions behind every Invest tile. Saving reruns today's feed. */
export default async function InvestSettingsPage() {
  const viewer = await requireAdmin("/admin/invest");
  const es = await envState();
  const { assumptions, stored } = await getInvestAssumptions();
  return (
    <PortalFrame viewer={viewer} active="/admin/invest" banner={<EnvBar env={es.env} host={es.host} available={es.available} path="/admin/invest" />}>
      <div className="mx-auto max-w-[720px]">
        <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>Invest settings</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>
          The cost assumptions behind every listing card on the search map and every investment summary. {stored ? "Saved values are in use." : "Showing the defaults: nothing is saved yet."} Saving reruns today&apos;s feed.
        </p>
        <div className="mt-5"><InvestSettingsForm initial={assumptions} /></div>
      </div>
    </PortalFrame>
  );
}
