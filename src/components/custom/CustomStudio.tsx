"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Check, CircleAlert, Loader2, Sparkles, Stamp } from "lucide-react";
import LotBar from "@/components/plans/LotBar";
import { useLotFrame } from "@/components/plans/useLotFrame";
import type { DaduState } from "@/components/report/MasterPlan";
import MockCheckout from "@/components/checkout/MockCheckout";
import DraftPlan from "./DraftPlan";
import type { Block } from "@/lib/custom/layout";
import { dayLabel, type Slot } from "@/lib/queue";
import { withParcel } from "@/lib/parcel-context";
import { PRODUCTS, price } from "@/lib/pricing";
import { track } from "@/lib/analytics";
import type { Receipt } from "@/lib/payments";

const MasterPlan = dynamic(() => import("@/components/report/MasterPlan"), { ssr: false, loading: () => <div className="pd-plan-skel" aria-busy>Drawing your lot…</div> });

const PRESETS = [
  { w: 16, d: 20 },
  { w: 20, d: 25 },
  { w: 24, d: 24 },
];

type Draft = { blocks: Block[]; source: "ai" | "rules"; notes: string[]; w: number; d: number; stories: 1 | 2 };

/** The custom journey on one page: draw the footprint on your lot, get a draft layout, reserve a drafting slot. */
export default function CustomStudio() {
  const search = useSearchParams();
  const { state, setAddress, clear } = useLotFrame(search);
  const [dadu, setDadu] = useState<DaduState | null>(null);
  const [footprint, setFootprint] = useState<{ w: number; d: number; key: number } | null>(null);
  const [preset, setPreset] = useState("freehand");
  const [wIn, setWIn] = useState("");
  const [dIn, setDIn] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftErr, setDraftErr] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const id = useId();
  const tracked = useRef<string>("");

  useEffect(() => {
    fetch("/api/custom/queue").then((r) => (r.ok ? r.json() : null)).then((s) => s && setSlot(s)).catch(() => {});
  }, []);

  // Record a drawn footprint once it settles (not on every drag step).
  useEffect(() => {
    if (!dadu) return;
    const key = `${dadu.w}x${dadu.d}x${dadu.stories}`;
    const t = setTimeout(() => {
      if (tracked.current === key) return;
      tracked.current = key;
      track("footprint_drawn", { preset, fits: dadu.ok });
    }, 1500);
    return () => clearTimeout(t);
  }, [dadu, preset]);

  // A draft belongs to one footprint: changing the footprint clears it.
  const draftStale = draft && dadu && (draft.w !== dadu.w || draft.d !== dadu.d || draft.stories !== dadu.stories);

  const apply = (w: number, d: number, name: string) => {
    setPreset(name);
    setFootprint({ w, d, key: Date.now() });
    setWIn(String(w));
    setDIn(String(d));
  };

  async function generate() {
    if (!dadu) return;
    setDrafting(true);
    setDraftErr(null);
    try {
      const res = await fetch("/api/custom/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ w: dadu.w, d: dadu.d, stories: dadu.stories }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "draft_failed");
      setDraft({ ...j, w: dadu.w, d: dadu.d, stories: dadu.stories });
      track("draft_generated", { source: j.source });
    } catch (e) {
      setDraftErr(e instanceof Error && e.message !== "draft_failed" ? e.message : "The draft did not come through. Try again.");
    } finally {
      setDrafting(false);
    }
  }

  const ready = state.status === "ready";
  const pin = ready ? state.parcel.pin : null;
  const address = ready ? state.parcel.address : "";
  const step = receipt ? 4 : draft && !draftStale ? 3 : dadu ? 2 : 1;

  if (receipt) {
    return (
      <section className="cs-done" aria-live="polite">
        <span className="ck-icon" aria-hidden><Check size={24} /></span>
        <h2 className="pd-h2">Your DADU is in the drafting queue.</h2>
        <p className="pd-sub">
          {receipt.booked && receipt.queueWeek ? `This week was full, so your spot starts the week of ${dayLabel(receipt.queueWeek)}. ` : ""}
          {receipt.dueDate ? `Your plans will be ready by ${dayLabel(receipt.dueDate)}.` : ""} We emailed your receipt.
        </p>
        <div className="pd-upsell">
          <Stamp size={22} aria-hidden />
          <div>
            <p className="pd-upsell-h">Skip the permit paperwork. We&apos;ll take it from here.</p>
            <p className="pd-upsell-b">{PRODUCTS.permit.name}, {price(PRODUCTS.permit.amountCents)}. We prepare the set, submit it to SDCI, and handle every round of corrections.</p>
          </div>
          <Link href={withParcel("/permit", pin)} className="s-btn s-btn--primary">Get permitted <ArrowRight size={15} aria-hidden /></Link>
        </div>
      </section>
    );
  }

  return (
    <div className="cs">
      <ol className="cs-steps" aria-label="Steps">
        {["Draw your footprint", "Get a draft layout", "Reserve your plan"].map((s, i) => (
          <li key={s} data-state={i + 1 < step ? "done" : i + 1 === step ? "now" : "next"} aria-current={i + 1 === step ? "step" : undefined}>
            <span aria-hidden>{i + 1 < step ? <Check size={13} strokeWidth={3} /> : i + 1}</span> {s}
          </li>
        ))}
      </ol>

      <LotBar state={state} onAddress={setAddress} onClear={clear} prompt="Enter your address to draw on your lot" />

      {ready && (
        <>
          <section className="cs-tools" aria-labelledby={`${id}-size`}>
            <h2 id={`${id}-size`} className="pd-h2">Size your DADU</h2>
            <div className="cs-presets" role="group" aria-label="Preset footprints">
              {PRESETS.map((p) => (
                <button key={`${p.w}x${p.d}`} type="button" className="cs-preset" aria-pressed={preset === `${p.w}x${p.d}`} onClick={() => apply(p.w, p.d, `${p.w}x${p.d}`)}>
                  {p.w} x {p.d}
                  <span>{(p.w * p.d).toLocaleString()} sf footprint</span>
                </button>
              ))}
            </div>
            <form className="cs-custom" onSubmit={(e) => { e.preventDefault(); const w = Math.round(+wIn), d = Math.round(+dIn); if (w >= 10 && d >= 10) apply(w, d, "typed"); }}>
              <label htmlFor={`${id}-w`}>Width (ft)<input id={`${id}-w`} className="ck-input" inputMode="numeric" value={wIn} onChange={(e) => setWIn(e.target.value)} placeholder="20" /></label>
              <span aria-hidden className="cs-x">x</span>
              <label htmlFor={`${id}-d`}>Depth (ft)<input id={`${id}-d`} className="ck-input" inputMode="numeric" value={dIn} onChange={(e) => setDIn(e.target.value)} placeholder="25" /></label>
              <button type="submit" className="s-btn s-btn--outline">Apply</button>
            </form>
            <p className="cs-hint">Or drag the cottage and its handles on the plan (arrow keys move it, Shift with arrows resizes). Pick one or two stories under the plan.</p>
          </section>

          {dadu && (
            <p className={`cs-badge${dadu.ok ? "" : " cs-badge--no"}`} role="status" aria-live="polite">
              {dadu.ok ? <Check size={17} strokeWidth={3} aria-hidden /> : <CircleAlert size={17} aria-hidden />}
              {dadu.ok ? "Fits your lot and Seattle code." : dadu.reasons[0]}
              <span className="cs-size">{dadu.w} x {dadu.d} ft · {dadu.living.toLocaleString()} sf{dadu.stories === 2 ? " over 2 floors" : ""}</span>
            </p>
          )}

          <div className="pd-plan">
            <MasterPlan
              key={state.parcel.pin}
              lot={state.data.lot}
              sitePlan={state.data.sitePlan}
              feasibility={state.data.feasibility}
              report={state.adu}
              pin={state.data.parcel?.pin ?? null}
              terrain={state.data.terrain ?? null}
              mode="custom"
              footprint={footprint}
              onDaduState={setDadu}
            />
          </div>

          <section className="cs-draft" aria-labelledby={`${id}-draft`}>
            <h2 id={`${id}-draft`} className="pd-h2">Your draft layout</h2>
            {(!draft || draftStale) && (
              <>
                <button type="button" className="s-btn s-btn--primary" onClick={generate} disabled={!dadu?.ok || drafting}>
                  {drafting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Sparkles size={16} aria-hidden />}
                  {drafting ? "Drafting your layout…" : "Generate my draft layout"}
                </button>
                {!dadu?.ok && <p className="cs-hint">Get the footprint to fit your lot first.</p>}
                {draftErr && <p role="alert" className="ck-err">{draftErr}</p>}
              </>
            )}
            {draft && !draftStale && (
              <>
                <DraftPlan blocks={draft.blocks} w={draft.w} d={draft.d} stories={draft.stories} />
                {draft.notes.map((n) => <p key={n} className="cs-hint">{n}</p>)}
              </>
            )}
          </section>

          {draft && !draftStale && (
            <section className="cs-buy" aria-label="Reserve your plan">
              {slot && <p className="cs-slot">{slot.booked ? `This week is fully booked. Reserve your spot for ${dayLabel(slot.week)}.` : `Your plans will be ready by ${dayLabel(slot.readyBy)}.`}</p>}
              <MockCheckout
                kinds={["custom_plan"]}
                pin={pin}
                address={address}
                title={PRODUCTS.custom_plan.name}
                microcopy="Includes architect refinement and one round of revisions."
                meta={{ footprint: { w: draft.w, d: draft.d, stories: draft.stories }, draftSource: draft.source, blocks: draft.blocks }}
                successCta="See what happens next"
                success={(r) => ({ title: "Your DADU is in the drafting queue.", body: r.dueDate ? `Your plans will be ready by ${dayLabel(r.dueDate)}.` : "We will confirm your start date by email." })}
                onDone={(r) => {
                  track("custom_checkout", { booked: r.booked });
                  setReceipt(r);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
