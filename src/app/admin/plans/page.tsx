import type { Metadata } from "next";
import { Suspense } from "react";
import PortalFrame from "@/components/portal/PortalFrame";
import EnvBar from "@/components/admin/EnvBar";
import PlanLibrary from "@/components/admin/plans/PlanLibrary";
import { envState, requireAdmin } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Plans — Pencil admin" };
export const dynamic = "force-dynamic";

/** The plan library: upload drawing sets, watch extraction, correct and verify (src/lib/server/plan-library.ts). */
export default async function AdminPlansPage() {
  const viewer = await requireAdmin("/admin/plans");
  const es = await envState();
  return (
    <PortalFrame viewer={viewer} active="/admin/plans" wide banner={<EnvBar env={es.env} host={es.host} available={es.available} path="/admin/plans" />}>
      <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>Plan library</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>Drawing sets in a private bucket, read into building models, corrected and verified here. Plan sets with an address appear on the admin map.</p>
      <div className="mt-5">
        <Suspense>
          <PlanLibrary />
        </Suspense>
      </div>
    </PortalFrame>
  );
}
