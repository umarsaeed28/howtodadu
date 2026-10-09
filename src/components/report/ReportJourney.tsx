"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CircleAlert, LayoutTemplate, Lock, Mail, PencilRuler, UserRoundCheck } from "lucide-react";
import type { ADUReport } from "@/lib/adu-analysis";
import { computeFar, maxFarForZone } from "@/lib/feasibility/far";
import { withParcel } from "@/lib/parcel-context";
import { Term } from "@/components/home/HomeBits";
import { longDate } from "@/lib/pricing";

const sf = (n: number | null | undefined) => (n == null ? "n/a" : `${Math.round(n).toLocaleString()} sf`);

/** The free teaser: eligibility, lot size and zone in the clear; everything else waits behind the paywall. */
export function ReportTeaser({ eligible, lotSqft, zoning }: { eligible: boolean; lotSqft: number | null; zoning: string | null }) {
  return (
    <section className="rt" aria-labelledby="rt-h">
      <span className={`rt-icon${eligible ? "" : " rt-icon--warn"}`} aria-hidden>{eligible ? <BadgeCheck size={22} /> : <CircleAlert size={22} />}</span>
      <div className="min-w-0">
        <h2 id="rt-h" className="rt-h">{eligible ? "Good news. Your lot looks DADU-eligible." : "Your lot has some hurdles. Here's what we found."}</h2>
        <dl className="rt-facts">
          <div><dt>Lot size</dt><dd>{sf(lotSqft)}</dd></div>
          <div><dt>Zone</dt><dd>{zoning ?? "n/a"}</dd></div>
          {(["FAR", "Setbacks", "Height limit", "Buildable envelope"] as const).map((k) => (
            <div key={k} className="rt-locked">
              <dt>{k === "FAR" ? <Term word="FAR" /> : k}</dt>
              <dd><Lock size={13} aria-hidden /> <span className="sr-only">Locked</span><span aria-hidden className="rt-blur">0000</span></dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** The zoning limits that sit behind the paywall: FAR, setbacks, height and lot coverage. */
export function LimitsStrip({ adu, zoning, lotSqft, buildingSqft }: { adu: ADUReport | null; zoning: string | null; lotSqft: number | null; buildingSqft: number | null }) {
  const maxFar = maxFarForZone(zoning);
  const far = computeFar(buildingSqft, lotSqft);
  const fp = adu?.daduFootprint;
  const items: [React.ReactNode, string, string][] = [
    [<Term key="far" word="FAR" />, maxFar != null ? `${maxFar.toFixed(1)} max (est.)` : "n/a", far.ratio != null ? `${far.display} used today` : "Existing floor area unknown"],
    ["Setbacks", fp ? `${fp.rearSetback} ft rear · ${fp.sideSetback} ft side` : "n/a", "Front 20 ft, street side 10 ft"],
    ["Height limit", fp ? `${fp.maxHeight} ft` : adu?.height ? `${adu.height.total} ft` : "n/a", "Tied to lot width"],
    ["Lot coverage", adu?.coverage ? `${Math.round(adu.coverage.currentPercent)}% of ${Math.round(adu.coverage.maxPercent)}%` : "n/a", adu?.coverage ? `${sf(adu.coverage.availableSqft)} still open` : ""],
  ];
  return (
    <dl className="ls" aria-label="Zoning limits">
      {items.map(([k, v, note], i) => (
        <div key={i} className="ls-item">
          <dt>{k}</dt>
          <dd className="ls-v">{v}</dd>
          {note && <dd className="ls-note">{note}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** After payment: what was bought and when the architect review lands, plus the optional newsletter. */
export function PurchaseBanner({ kind, dueDate, email }: { kind: string; dueDate: string | null; email: string }) {
  const [news, setNews] = useState<"idle" | "busy" | "done">("idle");
  const due = dueDate ? (() => { const [y, m, d] = dueDate.split("-").map(Number); return longDate(new Date(y, m - 1, d)); })() : null;
  async function subscribe() {
    setNews("busy");
    try {
      await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, kind: "newsletter", message: "Weekly Seattle DADU opportunities", source: window.location.pathname }) });
    } catch {
      /* the purchase stands either way */
    }
    setNews("done");
  }
  return (
    <section className="pb" aria-live="polite">
      <span className="pb-icon" aria-hidden>{kind === "feasibility_reviewed" ? <UserRoundCheck size={20} /> : <BadgeCheck size={20} />}</span>
      <div className="min-w-0 flex-1">
        <p className="pb-title">{kind === "feasibility_reviewed" ? `Your lot is in an architect's hands. Expect your review by ${due ?? "3 business days from now"}.` : "Your full report is unlocked."}</p>
        <p className="pb-sub">{email ? `We emailed the receipt and a link to ${email}.` : "Bookmark this page to come back to it."}</p>
      </div>
      {email && (news === "done" ? (
        <p className="pb-news"><Mail size={14} aria-hidden /> You&apos;re on the weekly newsletter.</p>
      ) : (
        <button type="button" className="s-btn s-btn--outline pb-btn" onClick={subscribe} disabled={news === "busy"}>
          <Mail size={15} aria-hidden /> Weekly best Seattle DADU lots
        </button>
      ))}
    </section>
  );
}

/** The report footer: pick how to build it, with the parcel carried along, and the disclaimer. */
export function ReportNextSteps({ pin }: { pin: string | null }) {
  return (
    <section className="rn" aria-labelledby="rn-h">
      <h2 id="rn-h" className="rn-h">You know what fits. Now pick how to build it.</h2>
      <div className="rn-ctas">
        <Link href={withParcel("/plans", pin)} className="s-btn s-btn--primary s-btn--lg"><LayoutTemplate size={17} aria-hidden /> See plans that fit my lot <ArrowRight size={16} aria-hidden /></Link>
        <Link href={withParcel("/custom", pin)} className="s-btn s-btn--outline s-btn--lg"><PencilRuler size={17} aria-hidden /> Draw my own DADU</Link>
      </div>
      <p className="rn-disclaimer">This report is based on Seattle&apos;s public zoning and code rules. It is not a stamped professional certification.</p>
    </section>
  );
}
