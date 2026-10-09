"use client";

import { useActionState, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Home, Loader2, MapPin, PencilRuler } from "lucide-react";
import { loadPlan, loadPlanJson, type StoredPlan } from "@/lib/saved-plan";
import type { PreApprovedPlan } from "@/lib/preapproved-dadus";

const subscribe = () => () => {};
import { startProjectFromLot } from "@/app/start/actions";

/**
 * "Start your project with this lot?": yes creates the project from the last feasibility, no picks another address.
 * With a pre-approved `design`, the project starts with that design instead of the drawing from the report.
 */
export default function StartFromLot({ pin, address, street, design = null }: { pin: string; address: string; street: string; design?: PreApprovedPlan | null }) {
  // The drawing left on this lot's master plan (this browser), carried into the project.
  // Read from this browser after hydration (the server has no drawing), and attached to the form when it is sent.
  const json = useSyncExternalStore(subscribe, () => loadPlanJson(pin), () => null);
  const saved = useMemo(() => (json ? (JSON.parse(json) as StoredPlan) : null), [json]);
  const [state, action, pending] = useActionState(async (_: { error?: string }, fd: FormData) => {
    const p = design ? null : loadPlan(pin);
    if (p) fd.set("plan", JSON.stringify(p));
    return (await startProjectFromLot(fd)) ?? {};
  }, {});
  return (
    <form action={action} className="sl">
      <input type="hidden" name="pin" value={pin} />
      <input type="hidden" name="address" value={address} />
      {design && <input type="hidden" name="design" value={design.id} />}
      <p className="sl-k">Your last feasibility</p>
      <p className="sl-addr"><MapPin size={20} aria-hidden /> {street}</p>
      {pin && <p className="sl-pin">King County parcel {pin}</p>}
      {design && <p className="sl-drawn"><Home size={16} aria-hidden /> Pre-approved design: {design.name} by {design.designer}, {design.sqft.toLocaleString("en-US")} sf{design.stories === 2 ? " over 2 stories" : ""}. It comes with the project.</p>}
      {!design && saved?.drawn && <p className="sl-drawn"><PencilRuler size={16} aria-hidden /> Your DADU as drawn: {saved.drawn.w} x {saved.drawn.d} ft, {saved.drawn.living.toLocaleString("en-US")} sf{saved.drawn.stories === 2 ? " over 2 stories" : ""}. It comes with the project.</p>}
      <h2 className="sl-q">Is this the project you want to start?</h2>
      {state.error && <p role="alert" className="ck-err">{state.error}</p>}
      <div className="sl-ctas">
        <button type="submit" className="s-btn s-btn--primary s-btn--lg" disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
          {pending ? "Starting your project…" : "Yes, start with this lot"}
          {!pending && <ArrowRight size={16} aria-hidden />}
        </button>
        <Link href="/portal/new" className="s-btn s-btn--outline s-btn--lg">Use a different address</Link>
      </div>
    </form>
  );
}
