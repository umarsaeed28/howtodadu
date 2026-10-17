import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, Circle, CircleDot, Plus } from "lucide-react";
import PortalFrame from "@/components/portal/PortalFrame";
import ClaimOrders from "@/components/dashboard/ClaimOrders";
import WatchingList, { type WatchRow } from "@/components/dashboard/WatchingList";
import { homeFor, requireViewer, userClient } from "@/lib/portal/server";
import { loadCards } from "@/lib/portal/cards";
import { buildProperties, type Line, type OrderRow } from "@/lib/portal/dashboard";
import { claimOrders } from "@/lib/server/orders";
import { prettyAddress } from "@/lib/parcel-context";
import type { FeasibilityRow, PermitPackage } from "@/lib/portal/types";

export const metadata: Metadata = { title: "Your properties — Pencil" };
export const dynamic = "force-dynamic";

const ICON = { done: Check, active: CircleDot, todo: Circle } as const;

function Row({ line }: { line: Line }) {
  const Icon = ICON[line.state];
  return (
    <li className="db-line" data-state={line.state}>
      <Icon size={16} strokeWidth={line.state === "done" ? 3 : 2} aria-hidden />
      <span className="db-k">{line.label}</span>
      <span className="db-v">{line.detail}</span>
    </li>
  );
}

/** "Your properties": one card per property with feasibility, plan and permit status, and the one next step. */
export default async function Dashboard() {
  const viewer = await requireViewer("/dashboard");
  if (viewer.role !== "client") redirect(homeFor(viewer.role));
  const db = await userClient();

  // A verified email also brings in orders placed with it before the account existed.
  const { data: profile } = await db.from("profiles").select("email_verified_at").eq("id", viewer.id).maybeSingle();
  if (profile?.email_verified_at) await claimOrders(viewer.id, viewer.email).catch(() => 0);

  const cards = await loadCards(db).catch(() => []);
  const { data: orders } = await db.from("service_orders").select("*").order("created_at", { ascending: false });
  const properties = buildProperties({
    projects: cards.map((c) => c.project),
    feasibility: cards.map((c) => c.feasibility).filter((f): f is FeasibilityRow => !!f),
    permits: cards.map((c) => c.permit).filter((p): p is PermitPackage => !!p),
    orders: (orders ?? []) as OrderRow[],
  });
  // Opportunities saved from /invest. Empty until the watchlist table exists (migration 0010).
  const { data: watching } = await db.from("watchlist").select("id, listing_id, parcel_pin, address, photo, alert, snapshot").eq("status", "watching").order("created_at", { ascending: false });
  const watchRows = (watching ?? []) as WatchRow[];

  return (
    <PortalFrame viewer={viewer} active="/dashboard">
      <ClaimOrders />
      <div className="db-head">
        <div>
          <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>Your properties</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>{properties.length ? "Where each one stands, and the next step." : watchRows.length ? "Properties you are watching." : "Nothing here yet."}</p>
        </div>
        <Link href="/feasibility" className="pa-btn pa-btn-primary no-underline"><Plus size={15} aria-hidden /> Check a lot</Link>
      </div>

      {properties.length === 0 && watchRows.length > 0 ? null : properties.length === 0 ? (
        <div className="db-empty">
          <p className="db-empty-h">Start with your lot.</p>
          <p>See what you can build in 30 seconds. Reports, plans and permits you buy show up here.</p>
          <Link href="/feasibility" className="pa-btn pa-btn-primary no-underline">Check my lot <ArrowRight size={15} aria-hidden /></Link>
        </div>
      ) : (
        <ul className="db-grid">
          {properties.map((p) => (
            <li key={p.key} className="db-card">
              <p className="db-addr">{prettyAddress(p.address) || "Your property"}</p>
              {p.pin && <p className="db-pin">Parcel {p.pin}</p>}
              <ul className="db-lines">
                <Row line={p.feasibility} />
                <Row line={p.plan} />
                <Row line={p.permit} />
              </ul>
              <Link href={p.next.href} className="pa-btn pa-btn-primary db-next no-underline">{p.next.text} <ArrowRight size={15} aria-hidden /></Link>
              <p className="db-links">
                <Link href="/portal/reports">Reports</Link>
                <Link href={p.pin ? `/plans?parcel=${p.pin}` : "/plans"}>Plans</Link>
                {p.projectId && <Link href={`/portal/projects/${p.projectId}`}>Project</Link>}
              </p>
            </li>
          ))}
        </ul>
      )}
      <WatchingList rows={watchRows} />
    </PortalFrame>
  );
}
