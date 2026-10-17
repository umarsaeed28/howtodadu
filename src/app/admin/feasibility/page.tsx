import type { Metadata } from "next";
import PortalFrame from "@/components/portal/PortalFrame";
import EnvBar from "@/components/admin/EnvBar";
import FeasibilityPencil from "@/components/feasibility-pencil/FeasibilityPencil";
import AdminWorkspace from "@/components/admin/workspace/AdminWorkspace";
import { envState, requireAdmin } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Feasibility — Pencil admin" };
export const dynamic = "force-dynamic";

/** The same feasibility tool and report as /feasibility, with the admin lot panel. */
export default async function AdminFeasibilityPage() {
  const viewer = await requireAdmin("/admin/feasibility");
  const es = await envState();
  return (
    <PortalFrame viewer={viewer} active="/admin/feasibility" wide banner={<EnvBar env={es.env} host={es.host} available={es.available} path="/admin/feasibility" />}>
      <AdminWorkspace>
        <FeasibilityPencil />
      </AdminWorkspace>
    </PortalFrame>
  );
}
