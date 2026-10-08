import { Suspense } from "react";
import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import MapHome from "@/components/map/MapHome";

export const metadata: Metadata = {
  title: "Search DADU lots in Seattle — Pencil",
  description:
    "Every single-family lot in Seattle that can take a backyard cottage, scored and mapped. Pick a lot to open its feasibility report.",
};

export default function SearchPage() {
  return (
    <main className="pencil-app">
      <Suspense>
        <MapHome />
      </Suspense>
    </main>
  );
}
