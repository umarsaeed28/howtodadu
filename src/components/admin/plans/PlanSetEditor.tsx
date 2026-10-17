"use client";

import { useState } from "react";
import { Check, ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { MODEL_FIELDS, SHEET_KINDS, emptyModel, type BuildingModel } from "@/lib/plans/building-model";
import type { PlanLicense, PlanSetRow } from "@/lib/server/plan-library";

const KIND_LABEL: Record<string, string> = { floor_plan: "floor plan", site: "site", elevation: "elevation", section: "section", code_summary: "code summary", other: "other" };

/**
 * Review for one plan set: its files (pages, vector or scanned, sheets, a signed link to open each), the metadata
 * form, and the BuildingModel extraction drafted, field by field with the page each value came from. Save keeps the
 * correction; Save and verify puts the set in the corpus.
 */
export default function PlanSetEditor({ set, onSaved, onRetry }: { set: PlanSetRow; onSaved: () => void; onRetry: (fileIds: string[]) => void }) {
  const base = set.model ?? set.draft_model ?? emptyModel();
  const [meta, setMeta] = useState({
    title: set.title,
    address: set.address ?? "",
    neighborhood: set.neighborhood ?? "",
    permit_number: set.permit_number ?? "",
    built: set.built == null ? "" : set.built ? "yes" : "no",
    build_cost: set.build_cost_cents == null ? "" : String(Math.round(set.build_cost_cents / 100)),
    permit_days: set.permit_days == null ? "" : String(set.permit_days),
    license: set.license,
    tags: set.tags.join(", "),
  });
  const [model, setModel] = useState<BuildingModel>(base);
  const [saving, setSaving] = useState<null | "save" | "verify">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const failed = (set.files ?? []).filter((f) => f.status === "failed" && f.uploaded).map((f) => f.id);

  async function save(verify: boolean) {
    setSaving(verify ? "verify" : "save");
    setMsg(null);
    const cost = meta.build_cost.trim() ? Number(meta.build_cost.replace(/[$,\s]/g, "")) : null;
    const days = meta.permit_days.trim() ? Number(meta.permit_days) : null;
    if ((cost != null && !(cost >= 0)) || (days != null && !(days >= 0))) {
      setSaving(null);
      return setMsg({ ok: false, text: "Build cost and permit days must be positive numbers." });
    }
    try {
      const r = await fetch(`/api/admin/plans/sets/${set.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meta.title,
          address: meta.address || null,
          neighborhood: meta.neighborhood || null,
          permit_number: meta.permit_number || null,
          built: meta.built === "" ? null : meta.built === "yes",
          build_cost_cents: cost == null ? null : Math.round(cost * 100),
          permit_days: days,
          license: meta.license,
          tags: meta.tags.split(",").map((t) => t.trim()).filter(Boolean),
          model,
          verify,
        }),
      });
      const j = (await r.json()) as { ok: boolean; error?: string; set?: PlanSetRow };
      if (!j.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setMsg({ ok: true, text: verify ? "Verified: the set is in the corpus." : `Saved.${meta.address && j.set?.lat == null ? " The address could not be placed on the map." : ""}` });
      onSaved();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setSaving(null);
    }
  }

  const evidence = (key: string) => model.evidence.filter((e) => e.field === key);
  const setField = (key: keyof BuildingModel, raw: string, type: "number" | "text") =>
    setModel((m) => ({ ...m, [key]: raw.trim() === "" ? null : type === "number" ? (Number.isFinite(Number(raw)) ? Number(raw) : m[key]) : raw }));

  return (
    <div className="aw-panel pl-editor">
      <section aria-label="Files">
        <h3 className="aw-h3">Files</h3>
        <ul className="aw-list">
          {(set.files ?? []).map((f) => (
            <li key={f.id}>
              <a href={`/api/admin/plans/files/${f.id}/url`} target="_blank" rel="noopener noreferrer" className="aw-row-t underline underline-offset-2">{f.rel_path} <ExternalLink size={12} className="inline" aria-hidden /></a>
              <span className="aw-muted block">
                {f.status.replace("_", " ")}
                {f.page_count != null ? ` | ${f.page_count} pages` : ""}
                {f.pdf_kind ? ` | ${f.pdf_kind}` : ""}
                {f.sheets?.length ? ` | ${summarizeSheets(f.sheets.map((s) => s.kind))}` : ""}
              </span>
              {f.error && <span className="block text-xs" style={{ color: f.status === "failed" ? "var(--red)" : "var(--amber)" }}>{f.error}</span>}
            </li>
          ))}
        </ul>
        {failed.length > 0 && <button type="button" className="pa-btn pa-btn-sm" style={{ marginTop: 8 }} onClick={() => onRetry(failed)}><RotateCcw size={14} aria-hidden /> Retry failed files</button>}
      </section>

      <section aria-label="Plan set details">
        <h3 className="aw-h3">Details</h3>
        <div className="pl-form">
          <Field label="Title"><input className="pl-input" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></Field>
          <Field label="Address"><input className="pl-input" value={meta.address} onChange={(e) => setMeta({ ...meta, address: e.target.value })} placeholder="1234 N 45th St, Seattle, WA" /></Field>
          <Field label="Neighborhood"><input className="pl-input" value={meta.neighborhood} onChange={(e) => setMeta({ ...meta, neighborhood: e.target.value })} /></Field>
          <Field label="Permit number"><input className="pl-input" value={meta.permit_number} onChange={(e) => setMeta({ ...meta, permit_number: e.target.value })} /></Field>
          <Field label="Built">
            <select className="pl-input" value={meta.built} onChange={(e) => setMeta({ ...meta, built: e.target.value })}>
              <option value="">Unknown</option><option value="yes">Yes</option><option value="no">No</option>
            </select>
          </Field>
          <Field label="Build cost ($)"><input className="pl-input" inputMode="numeric" value={meta.build_cost} onChange={(e) => setMeta({ ...meta, build_cost: e.target.value })} /></Field>
          <Field label="Permit duration (days)"><input className="pl-input" inputMode="numeric" value={meta.permit_days} onChange={(e) => setMeta({ ...meta, permit_days: e.target.value })} /></Field>
          <Field label="License">
            <select className="pl-input" value={meta.license} onChange={(e) => setMeta({ ...meta, license: e.target.value as PlanLicense })}>
              <option value="internal">Internal only</option><option value="precedent">Precedent display</option><option value="template">Template basis</option>
            </select>
          </Field>
          <Field label="Tags (comma separated)"><input className="pl-input" value={meta.tags} onChange={(e) => setMeta({ ...meta, tags: e.target.value })} /></Field>
        </div>
      </section>

      <section aria-label="Building model">
        <h3 className="aw-h3">Building model {set.model ? "(corrected)" : set.draft_model ? "(draft from extraction)" : "(no draft yet)"}</h3>
        <div className="pl-form">
          <Field label="Structure">
            <select className="pl-input" value={model.structure_type} onChange={(e) => setModel({ ...model, structure_type: e.target.value as BuildingModel["structure_type"] })}>
              {["DADU", "AADU", "house", "duplex", "multiplex", "other"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          {MODEL_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} hint={evidence(f.key).map((e) => `p.${e.page}: "${e.quote}"`).join("; ")}>
              <input className="pl-input" inputMode={f.type === "number" ? "decimal" : undefined} value={(model[f.key] as string | number | null) ?? ""} onChange={(e) => setField(f.key, e.target.value, f.type)} />
            </Field>
          ))}
        </div>
        {model.levels.length > 0 && <p className="aw-muted" style={{ marginTop: 8 }}>Levels: {model.levels.map((l) => `${l.name}${l.area_sqft != null ? ` ${l.area_sqft.toLocaleString("en-US")} sf` : ""}`).join(", ")}</p>}
        {model.notes && <p className="aw-muted" style={{ marginTop: 4 }}>Notes: {model.notes}</p>}
      </section>

      {msg && <p role={msg.ok ? "status" : "alert"} style={{ color: msg.ok ? "var(--green)" : "var(--red)", fontWeight: 600 }}>{msg.text}</p>}
      <div className="aw-actions">
        <button type="button" className="pa-btn pa-btn-sm" onClick={() => void save(false)} disabled={!!saving}>{saving === "save" && <Loader2 size={14} className="animate-spin" aria-hidden />} Save</button>
        <button type="button" className="pa-btn pa-btn-primary pa-btn-sm" onClick={() => void save(true)} disabled={!!saving || set.status === "verified"}>{saving === "verify" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Check size={14} aria-hidden />} {set.status === "verified" ? "Verified" : "Save and verify"}</button>
      </div>
    </div>
  );
}

function summarizeSheets(kinds: string[]): string {
  const counts = new Map<string, number>();
  for (const k of kinds) counts.set(k, (counts.get(k) ?? 0) + 1);
  return SHEET_KINDS.filter((k) => counts.has(k)).map((k) => `${counts.get(k)} ${KIND_LABEL[k]}`).join(", ");
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="pl-field">
      <span className="pl-field-l">{label}</span>
      {children}
      {hint ? <span className="pl-field-h">{hint}</span> : null}
    </label>
  );
}
