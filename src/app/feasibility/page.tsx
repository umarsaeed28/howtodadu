import { Suspense } from "react";
import type { Metadata } from "next";
import FeasibilityPencil from "@/components/feasibility-pencil/FeasibilityPencil";
import MembersTeaser from "@/components/members/MembersTeaser";
import { currentAdmin } from "@/lib/admin/server";

export const metadata: Metadata = {
  title: "Check a property — Pencil",
  description:
    "See what a Seattle lot can become. Get an early read on middle-housing potential, with a clear score and verdict. Preliminary insights from Seattle City GIS.",
  robots: { index: false, follow: false },
};

/** Admin-only (src/lib/admin/gate.ts). Buyers read their reports in the portal (/portal/reports). */
export default async function FeasibilityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await currentAdmin())) {
    const a = (await searchParams).address;
    return <MembersTeaser from="/feasibility" address={(Array.isArray(a) ? a[0] : a)?.slice(0, 200)} />;
  }
  return (
    <div className="pencil-app">
      <Suspense>
        <FeasibilityPencil />
      </Suspense>
    </div>
  );
}
