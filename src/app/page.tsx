import { Suspense } from "react";
import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import MapHome from "@/components/map/MapHome";

export const metadata: Metadata = {
  title: "Pencil: DADU lots in Seattle",
  description:
    "Every single-family lot in Seattle that can take a backyard cottage, scored and mapped. Pick a lot to open its feasibility report.",
};

export default function Home() {
  return (
    <main className="pencil-app">
      <Suspense>
        <MapHome />
      </Suspense>
    </main>
  );
}
