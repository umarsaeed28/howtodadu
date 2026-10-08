"use client";

import { useState } from "react";
import { addDesignOption, addUpdate, routeToGcs, setAddress, setBrokerageFee, setPermitStatus, setStage } from "@/app/portal/actions";
import { matchGcs, PERMIT_LABELS, PERMIT_STATUSES, STAGES, STAGE_LABELS, usd, type ProjectBundle } from "@/lib/portal/types";
import { ActionForm, field, label } from "./ActionForm";

function Section({ id, title, open, onToggle, children }: { id: string; title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="border-t py-3 first:border-t-0" style={{ borderColor: "var(--hairline)" }}>
      <button type="button" id={`adm-${id}`} className="flex w-full items-center justify-between text-left text-sm font-semibold" style={{ color: "var(--ink)" }} aria-expanded={open} onClick={onToggle}>
        {title}
        <span aria-hidden style={{ color: "var(--slate)" }}>{open ? "–" : "+"}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

/** The admin's controls on a project: stage, permit status, design options, builder routing, revenue, updates. */
export default function AdminPanel({ b }: { b: ProjectBundle }) {
  const { project: p, permit, buildRequest, referrals, gcs, files } = b;
  const [open, setOpen] = useState<string | null>("stage");
  const toggle = (id: string) => setOpen(open === id ? null : id);
  const matches = buildRequest ? matchGcs(buildRequest, gcs) : gcs.map((gc) => ({ gc, points: 0 }));
  const referred = new Set(referrals.map((r) => r.gc_id));

  return (
    <aside className="pa-raised p-4 sm:p-5" aria-label="Admin controls">
      <p className="pa-eyebrow" style={{ color: "var(--green)" }}>Admin</p>

      <Section id="stage" title={`Stage: ${STAGE_LABELS[p.stage]}`} open={open === "stage"} onToggle={() => toggle("stage")}>
        <ActionForm action={async (fd) => setStage(p.id, String(fd.get("stage")))} submitLabel="Move" primary={false}>
          <select name="stage" className={field} defaultValue={p.stage}>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
        </ActionForm>
        {!p.address && (
          <ActionForm action={(fd) => setAddress(p.id, fd)} submitLabel="Set address" primary={false} className="mt-3 flex flex-col gap-3">
            <label className={label} style={{ color: "var(--ink)" }}>
              Lot found: address
              <input name="address" className={field} placeholder="610 N 125th St, Seattle" />
            </label>
          </ActionForm>
        )}
      </Section>

      {permit && (
        <Section id="permit" title={`Permit: ${PERMIT_LABELS[permit.status]}${permit.correction_rounds ? ` (${permit.correction_rounds} rounds)` : ""}`} open={open === "permit"} onToggle={() => toggle("permit")}>
          <ActionForm action={async (fd) => setPermitStatus(p.id, String(fd.get("status")))} submitLabel="Set status" primary={false}>
            <select name="status" className={field} defaultValue={permit.status}>
              {PERMIT_STATUSES.map((s) => <option key={s} value={s}>{PERMIT_LABELS[s]}</option>)}
            </select>
            <p className="text-xs" style={{ color: "var(--slate)" }}>Moving to Corrections again counts a new round. Paid: {permit.paid_at ? new Date(permit.paid_at).toLocaleDateString() : "no"}.</p>
          </ActionForm>
          <ActionForm action={(fd) => addDesignOption(p.id, fd)} submitLabel="Add design option" primary={false} className="mt-4 flex flex-col gap-3">
            <label className={label} style={{ color: "var(--ink)" }}>
              Design option title
              <input name="title" className={field} placeholder="Option A: 2-bed, gable roof" />
            </label>
            <label className={label} style={{ color: "var(--ink)" }}>
              Description
              <textarea name="description" className={field} rows={2} style={{ padding: "0.75rem 1.1rem" }} />
            </label>
            <label className={label} style={{ color: "var(--ink)" }}>
              Attach an uploaded file
              <select name="file_id" className={field} defaultValue="">
                <option value="">None</option>
                {files.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
          </ActionForm>
        </Section>
      )}

      <Section id="route" title={`Builders: ${referrals.length} referred`} open={open === "route"} onToggle={() => toggle("route")}>
        {!buildRequest && <p className="mb-2 text-xs" style={{ color: "var(--slate)" }}>No questionnaire yet, so there is no lead type to match on.</p>}
        <ActionForm action={(fd) => routeToGcs(p.id, fd)} submitLabel="Route to builders" primary={false}>
          <ul className="flex flex-col gap-1.5">
            {matches.map(({ gc, points }) => (
              <li key={gc.id}>
                <label className="pa-inset flex items-center gap-2 px-3 py-2 text-sm" style={{ color: "var(--ink)" }}>
                  <input type="checkbox" name="gc_id" value={gc.id} disabled={referred.has(gc.id)} defaultChecked={referred.has(gc.id)} className="accent-[var(--green)]" />
                  <span className="min-w-0 flex-1 truncate">{gc.company}</span>
                  <span className="text-[11px] tabular-nums" style={{ color: points >= 2 ? "var(--green)" : "var(--slate)" }}>{referred.has(gc.id) ? "referred" : `${points}/3 match`}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <label className={label} style={{ color: "var(--ink)" }}>
              Fee type
              <select name="fee_type" className={field} defaultValue="percent"><option value="percent">Percent of contract</option><option value="flat">Flat</option></select>
            </label>
            <label className={label} style={{ color: "var(--ink)" }}>
              Fee (% or $)
              <input name="fee_value" className={field} inputMode="decimal" defaultValue="5" />
            </label>
          </div>
          <label className={label} style={{ color: "var(--ink)" }}>
            Referral agreement
            <input name="agreement_note" className={field} placeholder="Signed 2026-10-01, standard terms" />
          </label>
        </ActionForm>
      </Section>

      <Section id="revenue" title={`Brokerage fee: ${usd(p.brokerage_fee_cents)}`} open={open === "revenue"} onToggle={() => toggle("revenue")}>
        <ActionForm action={(fd) => setBrokerageFee(p.id, fd)} submitLabel="Save" primary={false}>
          <label className={label} style={{ color: "var(--ink)" }}>
            Brokerage revenue on this project (USD)
            <input name="fee" className={field} inputMode="numeric" defaultValue={p.brokerage_fee_cents ? Math.round(p.brokerage_fee_cents / 100) : ""} />
          </label>
        </ActionForm>
      </Section>

      <Section id="update" title="Post an update" open={open === "update"} onToggle={() => toggle("update")}>
        <ActionForm action={(fd) => addUpdate(p.id, fd)} submitLabel="Send update" primary={false}>
          <textarea name="message" className={field} rows={3} style={{ padding: "0.75rem 1.1rem" }} placeholder="Emailed to the client and shown on their card." />
        </ActionForm>
      </Section>
    </aside>
  );
}
