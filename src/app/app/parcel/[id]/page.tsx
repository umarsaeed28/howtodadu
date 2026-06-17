import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { parcels, getParcel } from "@/lib/parcels";
import { usdM } from "@/lib/format";
import Gallery from "@/components/pencil-app/detail/Gallery";
import ParcelDealWorkspace from "@/components/pencil-app/detail/ParcelDealWorkspace";
import SiteFacts from "@/components/pencil-app/detail/SiteFacts";
import MiniMapLazy from "@/components/pencil-app/detail/MiniMapLazy";
import ActionBar from "@/components/pencil-app/detail/ActionBar";
import SimilarParcels from "@/components/pencil-app/detail/SimilarParcels";
import DetailHeaderActions from "@/components/pencil-app/detail/DetailHeaderActions";

export function generateStaticParams() {
  return parcels.map((p) => ({ id: p.id }));
}

export default async function ParcelDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parcel = getParcel(id);
  if (!parcel) notFound();

  return (
    <div className="pb-28 md:pb-0">
      <main className="mx-auto max-w-6xl px-4 py-4">
        <Link
          href="/app"
          className="mb-3 inline-flex items-center gap-1 text-sm"
          style={{ color: "var(--slate)" }}
        >
          <ChevronLeft size={16} aria-hidden /> Back to results
        </Link>

        <Gallery parcel={parcel} />

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="pa-mono text-xl font-medium">{parcel.address}</h1>
            <p className="text-sm" style={{ color: "var(--slate)" }}>
              {parcel.neighborhood}
              {parcel.nearTransit ? " · near frequent transit" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="pa-mono text-2xl font-medium">{usdM(parcel.listPrice)}</span>
            <DetailHeaderActions parcelId={parcel.id} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <ParcelDealWorkspace parcel={parcel} />

            <SiteFacts parcel={parcel} />

            <section>
              <h2 className="pa-display mb-3 text-base">Location</h2>
              <MiniMapLazy parcel={parcel} />
            </section>

            <SimilarParcels parcel={parcel} />
          </div>

          {/* Desktop right rail */}
          <aside className="hidden md:block">
            <div className="pa-card sticky top-20 p-4">
              <ActionBar parcel={parcel} />
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile sticky action bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t bg-[var(--card)] p-3 md:hidden"
        style={{ borderColor: "var(--hairline)" }}
      >
        <ActionBar parcel={parcel} />
      </div>
    </div>
  );
}
