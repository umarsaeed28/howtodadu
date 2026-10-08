import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import PortalFrame from "@/components/portal/PortalFrame";
import ProjectCard from "@/components/portal/ProjectCard";
import { homeFor, requireViewer, userClient } from "@/lib/portal/server";
import { loadCards } from "@/lib/portal/cards";

export const metadata: Metadata = { title: "My projects — Pencil" };
export const dynamic = "force-dynamic";

/** The client's home: every project as a card with its stage, next action and latest update. */
export default async function PortalHome() {
  const viewer = await requireViewer("/portal");
  if (viewer.role !== "client") redirect(homeFor(viewer.role));
  const db = await userClient();
  const cards = await loadCards(db);
  return (
    <PortalFrame viewer={viewer} active="/portal">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>My projects</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>{cards.length ? "One next action per project." : "Start with the property you own, or ask us to find a lot."}</p>
        </div>
        <Link href="/portal/new" className="pa-btn pa-btn-primary no-underline"><Plus size={15} aria-hidden /> New project</Link>
      </div>
      {cards.length === 0 ? (
        <div className="pa-raised mt-6 p-6 text-sm" style={{ color: "var(--ink)" }}>
          <p>No projects yet. The feasibility check is free and takes about a minute.</p>
          <Link href="/portal/new" className="pa-btn pa-btn-primary mt-4 inline-flex no-underline">Start a project</Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {cards.map((c) => (
            <li key={c.project.id}><ProjectCard b={c} /></li>
          ))}
        </ul>
      )}
    </PortalFrame>
  );
}
