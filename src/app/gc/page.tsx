import type { Metadata } from "next";
import Link from "next/link";
import PortalFrame from "@/components/portal/PortalFrame";
import { requireViewer, userClient } from "@/lib/portal/server";
import { BUILD_LABELS, usd, type Bid, type Project } from "@/lib/portal/types";

export const metadata: Metadata = { title: "Referred projects — Pencil" };
export const dynamic = "force-dynamic";

/** A partner builder's list: only the projects Pencil referred to them, with their bid and the build status. */
export default async function GcHome() {
  const viewer = await requireViewer("/gc", ["gc"]);
  const db = await userClient();
  const [{ data: projects }, { data: bids }] = await Promise.all([db.from("projects").select("*").order("updated_at", { ascending: false }), db.from("bids").select("*")]);
  const list = (projects ?? []) as Project[];
  const myBids = ((bids ?? []) as Bid[]).filter((b) => b.gc_id === viewer.gcId);
  return (
    <PortalFrame viewer={viewer} active="/gc">
      <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>Referred projects</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>{list.length ? "Bid on open projects and keep the build tracker current on the ones you won." : "Nothing referred to you yet."}</p>
      <ul className="mt-6 flex flex-col gap-3">
        {list.map((p) => {
          const bid = myBids.find((b) => b.project_id === p.id);
          const mine = p.selected_gc_id === viewer.gcId;
          const status = mine ? (p.build_status ? BUILD_LABELS[p.build_status] : "Won · contract next") : p.selected_gc_id ? "Closed" : bid ? `Your bid: ${usd(bid.amount_cents)}` : "Open for bids";
          return (
            <li key={p.id}>
              <Link href={`/portal/projects/${p.id}`} className="pa-raised flex items-center justify-between gap-3 p-4 no-underline">
                <div className="min-w-0">
                  <p className="truncate font-semibold" style={{ color: "var(--ink)" }}>{p.address?.replace(/,\s*Seattle,\s*WA.*$/i, "") ?? "Project"}</p>
                  <p className="text-xs" style={{ color: "var(--slate)" }}>{status}</p>
                </div>
                <span className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: mine ? "var(--green-tint)" : "var(--amber-tint)", color: mine ? "var(--green)" : "var(--amber)" }}>{mine ? "Yours" : p.selected_gc_id ? "Lost" : "Bid"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </PortalFrame>
  );
}
