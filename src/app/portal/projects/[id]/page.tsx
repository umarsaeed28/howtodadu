import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PortalFrame from "@/components/portal/PortalFrame";
import Stepper from "@/components/portal/Stepper";
import ActivityFeed from "@/components/portal/ActivityFeed";
import AdminPanel from "@/components/portal/AdminPanel";
import GcPanel from "@/components/portal/GcPanel";
import { AcquireStage, BuildStage, FeasibilityStageServer, FilesCard, PermitStage } from "@/components/portal/Stages";
import { confirmCheckout } from "@/app/portal/actions";
import { homeFor, loadProjectBundle, requireViewer, userClient } from "@/lib/portal/server";
import { nextAction, STAGE_LABELS } from "@/lib/portal/types";

export const metadata: Metadata = { title: "Project — Pencil" };
export const dynamic = "force-dynamic";

/** One project: the stepper, the active stage, files and updates, plus the admin or builder controls. */
export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ checkout?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const viewer = await requireViewer(`/portal/projects/${id}`);
  let checkoutError: string | null = null;
  if (sp.checkout) {
    const r = await confirmCheckout(sp.checkout);
    checkoutError = r.error ?? null;
  }
  const db = await userClient();
  const b = await loadProjectBundle(db, id);
  if (!b) notFound();
  const p = b.project;
  const na = nextAction(b);
  const title = p.address ? p.address.replace(/,\s*Seattle,\s*WA.*$/i, "") : "Finding a lot";

  const stageView =
    p.stage === "acquire" ? <AcquireStage b={b} viewer={viewer} /> :
    p.stage === "feasibility" ? <FeasibilityStageServer b={b} viewer={viewer} /> :
    p.stage === "permit" ? <PermitStage b={b} viewer={viewer} /> :
    <BuildStage b={b} viewer={viewer} />;

  return (
    <PortalFrame viewer={viewer} active={homeFor(viewer.role)} wide={viewer.role === "admin"}>
      <Stepper stage={p.stage} />
      <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={homeFor(viewer.role)} className="inline-flex items-center gap-1 text-xs font-semibold no-underline" style={{ color: "var(--green)" }}><ArrowLeft size={13} aria-hidden /> All projects</Link>
          <h1 className="pa-display mt-1 truncate text-2xl sm:text-3xl" style={{ color: "var(--ink)" }}>{title}</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--slate)" }}>{STAGE_LABELS[p.stage]}{p.parcel_id ? ` · parcel ${p.parcel_id}` : ""}</p>
        </div>
        <div className="rounded-xl px-3 py-2 text-sm" style={{ background: na.who === "client" ? "var(--amber-tint)" : "var(--green-tint)", color: na.who === "client" ? "var(--amber)" : "var(--green)" }}>
          <span className="text-[11px] font-bold uppercase tracking-wide">{na.who === "client" ? "Your next step" : na.who === "done" ? "Complete" : "In progress"}</span>
          <p className="font-semibold" style={{ color: "var(--ink)" }}>{na.text}</p>
        </div>
      </div>
      {sp.checkout === "cancelled" && <p className="mt-3 text-sm" style={{ color: "var(--slate)" }}>Checkout cancelled. Nothing was charged.</p>}
      {checkoutError && <p role="alert" className="mt-3 text-sm" style={{ color: "var(--red)" }}>{checkoutError}</p>}

      <div className={`mt-5 grid gap-5 ${viewer.role === "admin" ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
        <div className="flex min-w-0 flex-col gap-5">
          {stageView}
          {(p.stage === "build" || (p.stage === "feasibility" && b.files.length > 0)) && <FilesCard b={b} canUpload={viewer.role !== "gc"} />}
          {viewer.role === "gc" && viewer.gcId && <GcPanel project={p} myBid={b.bids.find((x) => x.gc_id === viewer.gcId) ?? null} gcId={viewer.gcId} />}
          <ActivityFeed items={b.activity} />
        </div>
        {viewer.role === "admin" && <div className="min-w-0"><AdminPanel b={b} /></div>}
      </div>
    </PortalFrame>
  );
}
