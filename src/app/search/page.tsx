import { Suspense } from "react";
import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import MapHome from "@/components/map/MapHome";
import MembersTeaser from "@/components/members/MembersTeaser";
import { currentAdmin } from "@/lib/admin/server";

export const metadata: Metadata = {
  title: "Search DADU lots in Seattle — Pencil",
  description:
    "Every single-family lot in Seattle that can take a DADU, scored and mapped. Pick a lot to open its feasibility report.",
  robots: { index: false, follow: false },
};

/** Admin-only (src/lib/admin/gate.ts): the proxy shows everyone else the members teaser; this checks again. */
export default async function SearchPage() {
  if (!(await currentAdmin())) return <MembersTeaser from="/search" />;
  return (
    <main className="pencil-app">
      <Suspense>
        <MapHome />
      </Suspense>
    </main>
  );
}
