import Link from "next/link";
import { Check, FileText, Paperclip } from "lucide-react";
import { decideDesign, pullParcel, selectBid, startPermitPackage } from "@/app/portal/actions";
import { ActionButton } from "./ActionForm";
import { Tracker } from "./Stepper";
import FileUpload from "./FileUpload";
import BuildQuestionnaire from "./BuildQuestionnaire";
import FeasibilityStage from "./FeasibilityStage";
import type { Viewer } from "@/lib/portal/server";
import { BUILD_LABELS, BUILD_STATUSES, FILE_KINDS, PERMIT_LABELS, PERMIT_PACKAGE, PERMIT_STATUSES, sizeTierFor, usd, type ProjectBundle } from "@/lib/portal/types";
import type { FeasibilitySummary } from "@/lib/portal/feasibility-summary";

const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="pa-raised p-5 sm:p-6" aria-label={title}>
      <h3 className="pa-display text-lg" style={{ color: "var(--ink)" }}>{title}</h3>
      {hint && <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ── Stage 1 ── */
export function AcquireStage({ b, viewer }: { b: ProjectBundle; viewer: Viewer }) {
  const p = b.project;
  if (!p.address) {
    return (
      <Card title="Pencil is finding your lot" hint="We shortlist Seattle lots that take a DADU and come back to you by email.">
        {p.lot_help_notes && <p className="pa-inset px-3 py-3 text-sm" style={{ color: "var(--ink)" }}>{p.lot_help_notes}</p>}
        {viewer.role === "admin" && <p className="mt-3 text-xs" style={{ color: "var(--slate)" }}>Set the address in the admin panel once a lot is under contract.</p>}
      </Card>
    );
  }
  return (
    <Card title="Pull the parcel" hint="We read the parcel, zoning, lot shape, trees and slope from the city and county, then score it. About 20 seconds.">
      <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>{p.address}</p>
      <div className="mt-4">
        <ActionButton action={pullParcel.bind(null, p.id)}>Confirm and pull the parcel</ActionButton>
      </div>
    </Card>
  );
}

/* ── Stage 2 ── */
export function FeasibilityStageServer({ b, viewer }: { b: ProjectBundle; viewer: Viewer }) {
  const f = b.feasibility;
  if (!f || !b.project.address) return <AcquireStage b={b} viewer={viewer} />;
  return <FeasibilityStage projectId={b.project.id} address={b.project.address} summary={f.summary as unknown as FeasibilitySummary} canStart={viewer.role !== "gc"} paid={!!b.permit?.paid_at} />;
}

/* ── Stage 3 ── */
export function PermitStage({ b, viewer }: { b: ProjectBundle; viewer: Viewer }) {
  const { project: p, permit, designs, files } = b;
  const canEdit = viewer.role !== "gc";
  if (!permit?.paid_at) {
    return (
      <Card title="Architecture and permit package" hint="One fixed fee. Pencil designs the DADU, draws the permit set, submits it and manages the city's corrections.">
        <p className="pa-display text-3xl tabular-nums" style={{ color: "var(--ink)" }}>{usd(PERMIT_PACKAGE.feeCents)}</p>
        <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>{PERMIT_PACKAGE.timeline}</p>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
          {PERMIT_PACKAGE.includes.map((x) => (
            <li key={x} className="flex items-center gap-2"><Check size={15} aria-hidden style={{ color: "var(--green)" }} /> {x}</li>
          ))}
        </ul>
        {canEdit && (
          <div className="mt-5">
            <ActionButton action={startPermitPackage.bind(null, p.id)}>Pay {usd(PERMIT_PACKAGE.feeCents)} and start</ActionButton>
            <p className="mt-2 text-xs" style={{ color: "var(--slate)" }}>Secure checkout by Stripe. Until Stripe is connected this records a test payment and charges nothing.</p>
          </div>
        )}
      </Card>
    );
  }
  const pending = designs.filter((d) => d.status === "proposed");
  return (
    <div className="flex flex-col gap-5">
      <Card title="Permit tracker" hint={`Paid ${when(permit.paid_at)}. ${permit.correction_rounds ? `${permit.correction_rounds} correction round${permit.correction_rounds === 1 ? "" : "s"} so far.` : ""}`}>
        <Tracker steps={PERMIT_STATUSES} labels={PERMIT_LABELS} current={permit.status} note={permit.correction_rounds ? { corrections: `×${permit.correction_rounds}` } : undefined} />
      </Card>

      <Card title="Design options" hint={pending.length && viewer.role === "client" ? "Pick the option you want drawn up. Approving one moves the package to drawings." : "Pencil posts design options here for your approval."}>
        {designs.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--slate)" }}>None yet. They arrive after kickoff.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {designs.map((d) => {
              const file = files.find((f) => f.id === d.file_id);
              return (
                <li key={d.id} className="pa-inset flex flex-col gap-2 p-4" style={d.status === "approved" ? { boxShadow: "inset 0 0 0 1.5px var(--green)" } : undefined}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold" style={{ color: "var(--ink)" }}>{d.title}</p>
                    <span className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold" style={d.status === "approved" ? { background: "var(--green-tint)", color: "var(--green)" } : d.status === "rejected" ? { background: "rgba(23,36,29,.08)", color: "var(--slate)" } : { background: "var(--amber-tint)", color: "var(--amber)" }}>
                      {d.status === "proposed" ? "Awaiting you" : d.status === "approved" ? "Approved" : "Passed"}
                    </span>
                  </div>
                  {d.description && <p className="text-sm" style={{ color: "var(--slate)" }}>{d.description}</p>}
                  {file && <a href={`/api/portal/files/${file.id}`} className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--green)" }}><Paperclip size={12} aria-hidden /> {file.name}</a>}
                  {d.status === "proposed" && canEdit && (
                    <div className="mt-1 flex gap-2">
                      <ActionButton action={decideDesign.bind(null, p.id, d.id, "approved")} className="pa-btn pa-btn-primary pa-btn-sm">Approve</ActionButton>
                      <ActionButton action={decideDesign.bind(null, p.id, d.id, "rejected")} className="pa-btn pa-btn-sm">Pass</ActionButton>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <FilesCard b={b} canUpload={canEdit} />
    </div>
  );
}

export function FilesCard({ b, canUpload }: { b: ProjectBundle; canUpload: boolean }) {
  return (
    <Card title="Files" hint="Drawings and city letters, newest first.">
      {b.files.length === 0 ? <p className="text-sm" style={{ color: "var(--slate)" }}>Nothing uploaded yet.</p> : (
        <ul className="flex flex-col divide-y" style={{ borderColor: "var(--hairline)" }}>
          {b.files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2 text-sm">
              <FileText size={16} aria-hidden style={{ color: "var(--green)" }} />
              <a href={`/api/portal/files/${f.id}`} className="min-w-0 flex-1 truncate font-semibold" style={{ color: "var(--ink)" }}>{f.name}</a>
              <span className="shrink-0 text-xs" style={{ color: "var(--slate)" }}>{FILE_KINDS[f.kind]} · {when(f.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
      {canUpload && <div className="mt-4"><FileUpload projectId={b.project.id} /></div>}
    </Card>
  );
}

/* ── Stage 4 ── */
export function BuildStage({ b, viewer }: { b: ProjectBundle; viewer: Viewer }) {
  const { project: p, buildRequest, bids, gcs } = b;
  const gcName = (id: string) => gcs.find((g) => g.id === id)?.company ?? "Builder";
  if (!buildRequest) {
    return (
      <Card title="Get a build quote" hint="Four quick questions. Pencil then sends your project to one to three partner builders who fit it, and their bids show up here.">
        {viewer.role === "client" || viewer.role === "admin" ? <BuildQuestionnaire projectId={p.id} defaultSize={sizeTierFor(b.feasibility?.max_dadu_sf)} /> : <p className="text-sm" style={{ color: "var(--slate)" }}>Waiting on the client.</p>}
      </Card>
    );
  }
  if (p.build_status || p.selected_gc_id) {
    return (
      <Card title={`Building with ${gcName(p.selected_gc_id ?? "")}`} hint={p.build_status ? `Now at ${BUILD_LABELS[p.build_status]}. The builder updates this as work moves.` : "Contract next. The tracker starts when it is signed."}>
        <Tracker steps={BUILD_STATUSES} labels={BUILD_LABELS} current={p.build_status} />
      </Card>
    );
  }
  return (
    <Card title={bids.length ? "Compare bids" : "Builders are bidding"} hint={bids.length ? "Side by side. Pick the one you want to sign with." : "Pencil has sent your project to builders. Bids appear here, and you get an email for each."}>
      {bids.length > 0 && (
        <div className="pa-scroll overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ color: "var(--slate)" }}>
                <th className="py-2 font-semibold">Builder</th>
                <th className="py-2 font-semibold">Price</th>
                <th className="py-2 font-semibold">Build time</th>
                <th className="py-2 font-semibold">Notes</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {bids.map((bid) => (
                <tr key={bid.id} className="border-t align-top" style={{ borderColor: "var(--hairline)" }}>
                  <td className="py-3 font-semibold" style={{ color: "var(--ink)" }}>{gcName(bid.gc_id)}</td>
                  <td className="py-3 tabular-nums" style={{ color: "var(--ink)" }}>{usd(bid.amount_cents)}</td>
                  <td className="py-3 tabular-nums" style={{ color: "var(--ink)" }}>{bid.timeline_weeks} wks</td>
                  <td className="py-3" style={{ color: "var(--slate)" }}>{bid.notes || "—"}</td>
                  <td className="py-3 text-right">{viewer.role !== "gc" && <ActionButton action={selectBid.bind(null, p.id, bid.id)} className="pa-btn pa-btn-primary pa-btn-sm" confirm={`Choose ${gcName(bid.gc_id)} at ${usd(bid.amount_cents)}?`}>Choose</ActionButton>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs" style={{ color: "var(--slate)" }}>
        Disclosure acknowledged {when(buildRequest.disclosure_ack_at)}: Pencil may receive a referral fee from contractors. <Link href="/contact" style={{ color: "var(--green)" }}>Questions?</Link>
      </p>
    </Card>
  );
}
