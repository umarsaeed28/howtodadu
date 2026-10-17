import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortalFrame from "@/components/portal/PortalFrame";
import PortalReport from "@/components/portal/PortalReport";
import { requireViewer } from "@/lib/portal/server";
import { buyerReport } from "@/lib/server/buyer-reports";
import { getFeasibilityForAddress } from "@/lib/server/feasibility-query";
import { listingForAddress } from "@/lib/server/listing-for-address";

export const metadata: Metadata = { title: "Your feasibility report — Pencil", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** One paid report, computed on the server for the buyer's own lot and opened in full. */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer(`/portal/reports/${id}`);
  const order = await buyerReport(viewer, id);
  if (!order) notFound();
  const outcome = order.address ? await getFeasibilityForAddress(order.address) : null;
  const data = outcome?.ok ? { ...outcome.data, listing: await listingForAddress(outcome.data.parcel?.address ?? order.address, outcome.data.parcel?.zip ?? null) } : null;
  const error = !order.address ? "This order has no address. Contact us and we will finish your report." : outcome && !outcome.ok ? outcome.error : null;
  return (
    <PortalFrame viewer={viewer} active="/portal/reports">
      <PortalReport data={data} error={error} kind={order.kind} />
    </PortalFrame>
  );
}
