import { Suspense } from "react";
import type { Metadata } from "next";
import { FeasibilityLayout } from "@/components/FeasibilityLayout";

export const metadata: Metadata = {
  title: "DADU Feasibility — How to DADU",
  description:
    "Fast acquisition screening for Seattle DADU investments. Get a deal score, opportunity snapshot, risk flags, and recommendation. Preliminary insights from Seattle City GIS.",
};

export default function FeasibilityPage() {
  return (
    <Suspense>
      <FeasibilityLayout />
    </Suspense>
  );
}
