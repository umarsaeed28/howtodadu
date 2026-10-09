import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PortalFrame from "@/components/portal/PortalFrame";
import StartFromLot from "@/components/portal/StartFromLot";
import { requireViewer } from "@/lib/portal/server";
import { resolveParcel } from "@/lib/server/parcel-lookup";
import { isPin, prettyAddress } from "@/lib/parcel-context";
import { PREAPPROVED_PLANS } from "@/lib/preapproved-dadus";

export const metadata: Metadata = { title: "Start your project — Pencil" };
export const dynamic = "force-dynamic";

/**
 * Where "Start my project" lands after sign-up or sign-in: confirm the lot from the last feasibility, then the
 * project is created from it. Without a lot, it goes to the new-project form. From a pre-approved plan page,
 * `design` names the plan the client placed on the lot, and it comes with the project.
 */
export default async function StartPage({ searchParams }: { searchParams: Promise<{ parcel?: string; address?: string; design?: string }> }) {
  const sp = await searchParams;
  const back = `/start?${new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]).toString()}`;
  const viewer = await requireViewer(back);
  const pin = isPin(sp.parcel) ? sp.parcel : "";
  let address = (sp.address ?? "").trim();
  if (!address && pin) address = (await resolveParcel(pin))?.address ?? "";
  if (!address) redirect("/portal/new");
  const full = /seattle/i.test(address) ? address : `${address}, Seattle, WA`;
  const design = PREAPPROVED_PLANS.find((p) => p.id === sp.design) ?? null;
  return (
    <PortalFrame viewer={viewer} active="/dashboard">
      <div className="mx-auto max-w-[620px]">
        <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>Start your project</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>We carry your feasibility over, so you pick up right where you left off.</p>
        <div className="mt-6">
          <StartFromLot pin={pin} address={full} street={prettyAddress(full)} design={design} />
        </div>
      </div>
    </PortalFrame>
  );
}
