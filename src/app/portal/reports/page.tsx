import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PortalFrame from "@/components/portal/PortalFrame";
import { requireViewer } from "@/lib/portal/server";
import { buyerReports } from "@/lib/server/buyer-reports";
import { PRODUCTS } from "@/lib/pricing";

export const metadata: Metadata = { title: "Reports — Pencil", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The feasibility reports this buyer paid for. Each opens the full report for that lot only. */
export default async function ReportsPage() {
  const viewer = await requireViewer("/portal/reports");
  const reports = await buyerReports(viewer);
  return (
    <PortalFrame viewer={viewer} active="/portal/reports">
      <div className="mx-auto max-w-[760px]">
        <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>Reports</h1>
        {reports.length === 0 ? (
          <div className="pa-raised mt-5 p-6">
            <p style={{ color: "var(--ink)", fontWeight: 600 }}>No reports yet.</p>
            <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>
              A feasibility report you order appears here. Ordered as a guest? Verify this account&apos;s email on the{" "}
              <Link href="/portal/account" className="underline underline-offset-2">Account page</Link> and it shows up.
            </p>
            <Link href="/feasibility" className="pa-btn pa-btn-primary mt-4 inline-flex no-underline">Order a report <ArrowRight size={15} aria-hidden /></Link>
          </div>
        ) : (
          <ul className="mt-5 grid gap-3">
            {reports.map((r) => (
              <li key={r.id} className="pa-raised flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate" style={{ color: "var(--ink)", fontWeight: 700 }}>{r.address || (r.pin ? `Parcel ${r.pin}` : "Your lot")}</p>
                  <p className="text-sm" style={{ color: "var(--slate)" }}>
                    {PRODUCTS[r.kind].name}
                    {r.paidAt ? ` | ordered ${new Date(r.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                    {r.kind === "feasibility_reviewed" && r.status !== "delivered" && r.dueDate ? ` | review due ${r.dueDate}` : ""}
                  </p>
                </div>
                <Link href={`/portal/reports/${r.id}`} className="pa-btn pa-btn-primary no-underline">Open report <ArrowRight size={15} aria-hidden /></Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PortalFrame>
  );
}
