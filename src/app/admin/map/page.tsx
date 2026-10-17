import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import PortalFrame from "@/components/portal/PortalFrame";
import EnvBar from "@/components/admin/EnvBar";
import AdminMap from "@/components/admin/workspace/AdminMap";
import AdminWorkspace from "@/components/admin/workspace/AdminWorkspace";
import { envState, requireAdmin } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Map — Pencil admin" };
export const dynamic = "force-dynamic";

/** The same map as /search, with plan library precedent pins and the admin lot panel. */
export default async function AdminMapPage() {
  const viewer = await requireAdmin("/admin/map");
  const es = await envState();
  return (
    <PortalFrame viewer={viewer} active="/admin/map" wide banner={<EnvBar env={es.env} host={es.host} available={es.available} path="/admin/map" />}>
      <AdminWorkspace>
        <AdminMap />
      </AdminWorkspace>
    </PortalFrame>
  );
}
