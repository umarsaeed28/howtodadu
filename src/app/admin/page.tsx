import type { Metadata } from "next";
import Link from "next/link";
import PortalFrame from "@/components/portal/PortalFrame";
import { requireViewer, userClient } from "@/lib/portal/server";
import { loadCards } from "@/lib/portal/cards";
import { nextAction, STAGES, STAGE_LABELS } from "@/lib/portal/types";

export const metadata: Metadata = { title: "Pipeline — Pencil admin" };
export const dynamic = "force-dynamic";

/** Every project, one column per stage. Leads without an address sit in Acquire. */
export default async function AdminBoard() {
  const viewer = await requireViewer("/admin", ["admin"]);
  const db = await userClient();
  const cards = await loadCards(db);
  const { data: owners } = await db.from("profiles").select("id, full_name, email");
  const ownerName = (id: string) => {
    const o = owners?.find((x) => x.id === id);
    return o?.full_name || o?.email || "Client";
  };
  return (
    <PortalFrame viewer={viewer} active="/admin" wide>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>Pipeline</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>{cards.length} project{cards.length === 1 ? "" : "s"} across four stages.</p>
        </div>
        <Link href="/portal/new" className="pa-btn no-underline">New project</Link>
      </div>
      <div className="pa-scroll mt-5 grid gap-3 overflow-x-auto md:grid-cols-4">
        {STAGES.map((s) => {
          const col = cards.filter((c) => c.project.stage === s);
          return (
            <section key={s} className="min-w-[240px] rounded-2xl p-3" style={{ background: "var(--green-tint)" }} aria-labelledby={`col-${s}`}>
              <h2 id={`col-${s}`} className="flex items-center justify-between px-1 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                {STAGE_LABELS[s]} <span className="tabular-nums" style={{ color: "var(--slate)" }}>{col.length}</span>
              </h2>
              <ul className="mt-2 flex flex-col gap-2">
                {col.map((c) => {
                  const na = nextAction(c);
                  const title = c.project.address ? c.project.address.replace(/,\s*Seattle,\s*WA.*$/i, "") : "Lead: finding a lot";
                  return (
                    <li key={c.project.id}>
                      <Link href={`/portal/projects/${c.project.id}`} className="pa-raised block p-3 no-underline">
                        <p className="truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</p>
                        <p className="truncate text-xs" style={{ color: "var(--slate)" }}>{ownerName(c.project.owner_id)}{c.feasibility ? ` · score ${c.feasibility.score}` : ""}</p>
                        <p className="mt-1.5 truncate text-xs font-semibold" style={{ color: na.who === "client" ? "var(--amber)" : "var(--green)" }}>{na.who === "client" ? "Client: " : ""}{na.text}</p>
                      </Link>
                    </li>
                  );
                })}
                {col.length === 0 && <li className="px-1 py-2 text-xs" style={{ color: "var(--slate)" }}>Empty</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </PortalFrame>
  );
}
