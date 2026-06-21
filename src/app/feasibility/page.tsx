import { Suspense } from "react";
import type { Metadata } from "next";
import FeasibilityPencil from "@/components/feasibility-pencil/FeasibilityPencil";

export const metadata: Metadata = {
  title: "Check a property — Pencil",
  description:
    "Free feasibility check for Seattle properties. See what's allowed, the build options, and a complete guide for each scenario.",
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
