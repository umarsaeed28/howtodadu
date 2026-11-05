import { Suspense } from "react";
import type { Metadata } from "next";
import CalculatorClient from "@/components/calculator/CalculatorClient";

export const metadata: Metadata = {
  title: "Estimate your return — Pencil",
  description:
    "Enter your own numbers to see what a backyard cottage costs and whether it pays. Construction is estimated at $350 per square foot.",
};

export default function CalculatorPage() {
  return (
    <main className="pencil-app">
      <Suspense>
        <CalculatorClient />
      </Suspense>
    </main>
  );
}
