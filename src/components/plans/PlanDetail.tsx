"use client";

import { useEffect, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Check, CircleAlert, Loader2, MailCheck, Stamp } from "lucide-react";
import type { PreApprovedPlan } from "@/lib/preapproved-dadus";
import { planFitFor } from "@/lib/site-envelope";
import { withParcel } from "@/lib/parcel-context";
import { lastEmail, rememberEmail } from "@/lib/report-access";
import { track } from "@/lib/analytics";
import { price, PRODUCTS } from "@/lib/pricing";
import type { DaduState } from "@/components/report/MasterPlan";
import LotBar from "./LotBar";
import { useLotFrame } from "./useLotFrame";

const MasterPlan = dynamic(() => import("@/components/report/MasterPlan"), { ssr: false, loading: () => <div className="pd-plan-skel" aria-busy>Drawing your lot…</div> });

/** The interactive half of a plan page: pick a size, see it on your lot, and request it. */
export default function PlanDetail({ variants }: { variants: PreApprovedPlan[] }) {
  const search = useSearchParams();
  const { state, setAddress, clear } = useLotFrame(search);
  const [variantId, setVariantId] = useState(variants[0].id);
  const [planState, setPlanState] = useState<DaduState | null>(null);
  const plan = variants.find((v) => v.id === variantId) ?? variants[0];
  const fit = state.status === "ready" && state.frame ? planFitFor(state.frame, plan) : null;

  useEffect(() => track("plan_viewed", { plan_id: plan.id }), [plan.id]);

  return (
    <div className="pd">
      {variants.length > 1 && (
        <fieldset className="pd-sizes">
          <legend className="pd-k">Approved sizes</legend>
          {variants.map((v) => (
            <label key={v.id} className="pd-size" data-on={v.id === variantId || undefined}>
              <input type="radio" name="variant" value={v.id} checked={v.id === variantId} onChange={() => setVariantId(v.id)} className="sr-only" />
              <span className="pd-size-name">{v.option}</span>
              <span className="pd-size-sf">{v.sqft.toLocaleString()} sf · {v.stories} {v.stories === 1 ? "story" : "stories"}</span>
            </label>
          ))}
        </fieldset>
      )}

      <section className="pd-lot" aria-labelledby="pd-lot-h">
        <h2 id="pd-lot-h" className="pd-h2">See it on my lot</h2>
        <LotBar state={state} onAddress={setAddress} onClear={clear} prompt="Enter your address to place this design on your lot" />
        {fit && (
          <p className={`pd-fit${fit.fits ? "" : " pd-fit--no"}`}>
            {fit.fits ? <Check size={16} strokeWidth={3} aria-hidden /> : <CircleAlert size={16} aria-hidden />}
            {fit.fits ? "Fits your lot as drawn." : `${fit.reason}. Pick another size or design, or go custom.`}
          </p>
        )}
        {state.status === "ready" && (
          <div className="pd-plan">
            <MasterPlan
              key={`${state.parcel.pin}-${plan.id}`}
              lot={state.data.lot}
              sitePlan={state.data.sitePlan}
              feasibility={state.data.feasibility}
              report={state.adu}
              pin={state.data.parcel?.pin ?? null}
              terrain={state.data.terrain ?? null}
              initialPlanId={plan.id}
              mode="plans"
              onDaduState={setPlanState}
            />
          </div>
        )}
        {planState && !planState.ok && fit?.fits && <p className="pd-note">Drag the design inside the green area to clear: {planState.reasons[0]}</p>}
      </section>

      <RequestPlan plan={plan} pin={state.status === "ready" ? state.parcel.pin : null} address={state.status === "ready" ? state.parcel.address : ""} />
    </div>
  );
}

function RequestPlan({ plan, pin, address }: { plan: PreApprovedPlan; pin: string | null; address: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => (typeof window === "undefined" ? "" : lastEmail()));
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<"form" | "sending" | "sent">("form");
  const [err, setErr] = useState<string | null>(null);
  const id = useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr("Tell us your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr("Enter a valid email so the firm can reach you.");
    setErr(null);
    setPhase("sending");
    try {
      const res = await fetch("/api/plans/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: plan.id, name, email, phone, message, pin, address }) });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error);
      rememberEmail(email);
      track("plan_requested", { plan_id: plan.id });
      setPhase("sent");
    } catch {
      setPhase("form");
      setErr("The request did not go through. Try again in a moment.");
    }
  }

  if (phase === "sent") {
    return (
      <section className="pd-sent" aria-live="polite">
        <span className="ck-icon" aria-hidden><MailCheck size={22} /></span>
        <h2 className="pd-h2">Request sent. {plan.designer} will reach out within 2 business days.</h2>
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
    <form className="pd-req" onSubmit={submit} noValidate aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="pd-h2">Request this plan</h2>
      <p className="pd-sub">We send your request to {plan.designer}. They license the plan to you directly and price it themselves. The design is built as drawn.</p>
      <div className="pd-grid">
        <label className="ck-label" htmlFor={`${id}-n`}>Your name<input id={`${id}-n`} className="ck-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        <label className="ck-label" htmlFor={`${id}-e`}>Email<input id={`${id}-e`} type="email" className="ck-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label className="ck-label" htmlFor={`${id}-p`}>Phone <span className="pd-opt">(optional)</span><input id={`${id}-p`} type="tel" className="ck-input" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></label>
      </div>
      <label className="ck-label" htmlFor={`${id}-m`}>Anything the firm should know? <span className="pd-opt">(optional)</span>
        <textarea id={`${id}-m`} className="ck-input pd-text" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Timing, budget, questions about the design" />
      </label>
      {err && <p role="alert" className="ck-err">{err}</p>}
      <button type="submit" className="s-btn s-btn--primary pd-send" disabled={phase === "sending"}>
        {phase === "sending" && <Loader2 size={15} className="animate-spin" aria-hidden />} Request this plan
      </button>
    </form>
  );
}
