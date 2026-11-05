import { Suspense } from "react";
import type { Metadata } from "next";
import FeasibilityPencil from "@/components/feasibility-pencil/FeasibilityPencil";

export const metadata: Metadata = {
  title: "Check a property — Pencil",
  description:
    "See what a Seattle lot can become. Get an early read on middle-housing potential, with a clear score and verdict. Preliminary insights from Seattle City GIS.",
};

export default function FeasibilityPage() {
  return (
    <div className="pencil-app">
      <Suspense>
        <FeasibilityPencil />
      </Suspense>
    </div>
  );
}
