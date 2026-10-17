"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Calculator, Check, CircleHelp, Info, Loader2, Sparkles, X } from "lucide-react";
import type { AdminLotPanel as Panel } from "@/lib/server/admin-lot-panel";
import type { ConstraintStatus } from "@/lib/rules/constraint-set";

const ICON: Record<ConstraintStatus, { el: React.ReactNode; color: string; label: string }> = {
  pass: { el: <Check size={14} aria-hidden />, color: "var(--green)", label: "Passes" },
  fail: { el: <X size={14} aria-hidden />, color: "var(--red)", label: "Fails" },
  info: { el: <Info size={14} aria-hidden />, color: "var(--slate)", label: "Rule" },
  unknown: { el: <CircleHelp size={14} aria-hidden />, color: "var(--amber)", label: "Unknown" },
};

/**
 * The admin side panel beside the shared map and report views. It follows the lot the view selected through the URL
 * (?pin= on the map, ?parcel= in feasibility), so the views themselves are the same components the public once had.
 */
export default function AdminLotPanel() {
  const sp = useSearchParams();
  const pin = sp.get("pin") ?? sp.get("parcel");
  const [state, setState] = useState<{ pin: string; panel?: Panel; error?: string } | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (!pin || !/^\d{10}$/.test(pin)) return;
    const ctl = new AbortController();
    setShowOptions(false);
    fetch(`/api/admin/lot-panel?pin=${pin}`, { signal: ctl.signal })
      .then(async (r) => {
        const j = await r.json();
        setState(r.ok ? { pin, panel: j as Panel } : { pin, error: (j as { error?: string }).error ?? `HTTP ${r.status}` });
      })
      .catch((e: unknown) => {
        if (!ctl.signal.aborted) setState({ pin, error: e instanceof Error ? e.message : "Could not load the lot." });
      });
    return () => ctl.abort();
  }, [pin]);

  if (!pin) return <aside className="aw-panel"><p className="aw-muted">Pick a lot to see its parcel data, constraints and plan options.</p></aside>;
  if (!state || state.pin !== pin) return <aside className="aw-panel" aria-busy="true"><p className="aw-muted"><Loader2 size={14} className="mr-1 inline animate-spin" aria-hidden /> Loading parcel {pin}…</p></aside>;
  if (state.error || !state.panel) return <aside className="aw-panel" role="alert"><p style={{ color: "var(--red)", fontWeight: 600 }}>Parcel {pin}: {state.error}</p></aside>;

  const p = state.panel;
  const v = p.validator;
  return (
    <aside className="aw-panel" aria-label={`Admin panel for ${p.address}`}>
      <header>
        <p className="aw-kicker">Parcel {p.pin}</p>
        <h2 className="aw-h">{p.address}</h2>
        <p className="aw-muted">
          {p.parcel.zoning ?? "zoning unknown"} | {p.parcel.lotSqft.toLocaleString("en-US")} sq ft
          {p.parcel.widthFt && p.parcel.depthFt ? ` | ${Math.round(p.parcel.widthFt)} x ${Math.round(p.parcel.depthFt)} ft` : ""}
          {p.parcel.yearBuilt ? ` | built ${p.parcel.yearBuilt}` : ""} | {p.parcel.alley ? "alley" : "no alley"} | {p.parcel.existingAdus} ADU{p.parcel.existingAdus === 1 ? "" : "s"}
        </p>
      </header>

      <div className="aw-actions">
        <button type="button" className="pa-btn pa-btn-primary pa-btn-sm" onClick={() => setShowOptions((s) => !s)} aria-expanded={showOptions}>
          <Sparkles size={14} aria-hidden /> {showOptions ? "Hide plan options" : "Generate plan options"}
        </button>
        <Link href={p.proformaHref} className="pa-btn pa-btn-sm no-underline"><Calculator size={14} aria-hidden /> Open proforma</Link>
      </div>

      {showOptions && (
        <section aria-label="Plan options">
          <h3 className="aw-h3">Plan options</h3>
          <ul className="aw-list">
            {p.playbook.playbook_options.map((o) => (
              <li key={o.configuration_name} className="aw-opt">
                <p className="aw-opt-t" style={{ color: o.feasible ? "var(--green)" : "var(--red)" }}>
                  {o.feasible ? <Check size={14} aria-hidden className="mr-1 inline" /> : <X size={14} aria-hidden className="mr-1 inline" />}
                  {o.configuration_name}
                  {o.feasible && <span className="aw-num"> {o.max_footprint_per_structure.toLocaleString("en-US")} sf footprint, {o.max_stories_allowed} st</span>}
                </p>
                <p className="aw-muted">{o.design_bottleneck_notes}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Validator report">
        <h3 className="aw-h3">Validator {v.ok ? <span style={{ color: "var(--green)" }}>passes</span> : <span style={{ color: "var(--red)" }}>flags issues</span>}</h3>
        {v.failures.length > 0 && <ul className="aw-list">{v.failures.map((f) => <li key={f} style={{ color: "var(--red)" }}>{f}</li>)}</ul>}
        {v.feasibleOptions.length > 0 && <p className="aw-muted">Feasible: {v.feasibleOptions.join(", ")}.</p>}
        {v.warnings.length > 0 && <ul className="aw-list">{v.warnings.map((w) => <li key={w} className="aw-muted">{w}</li>)}</ul>}
      </section>

      <section aria-label="Constraints">
        <h3 className="aw-h3">Constraints</h3>
        <ul className="aw-list">
          {p.constraints.map((c) => (
            <li key={c.id} className="aw-row">
              <span className="aw-ic" style={{ color: ICON[c.status].color }} title={ICON[c.status].label}>{ICON[c.status].el}<span className="sr-only">{ICON[c.status].label}</span></span>
              <span className="min-w-0">
                <span className="aw-row-t">{c.label}</span>
                <span className="aw-muted block">{c.limit}{c.lot ? ` | this lot: ${c.lot}` : ""}</span>
                <span className="aw-cite">{c.kind === "code" ? c.citation : "Pencil rule"}{c.verified ? "" : ", unconfirmed"}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Precedent plans nearby">
        <h3 className="aw-h3">Precedent plans nearby</h3>
        {p.precedents.length === 0 ? (
          <p className="aw-muted">None within a mile. <Link href="/admin/plans" className="underline underline-offset-2">Upload plan sets</Link>.</p>
        ) : (
          <ul className="aw-list">
            {p.precedents.map((x) => (
              <li key={x.id}>
                <Link href={`/admin/plans?set=${x.id}`} className="aw-row-t underline underline-offset-2">{x.title}</Link>
                <span className="aw-muted block">{x.address ?? "no address"} | {(x.distanceM / 1609).toFixed(2)} mi | {x.built ? "built" : x.built === false ? "not built" : "built?"} | {x.status.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
