"use client";

import { useEffect, useId, useState } from "react";
import { ArrowRight, Check, CircleCheck, CircleX, CreditCard, FlaskConical, Loader2, Mail } from "lucide-react";
import { PRODUCTS, type ProductId, type Receipt } from "@/lib/payments";
import { grantReportCredits, grantReportPayment, reportAccessEmail } from "@/lib/report-access";

const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;

const INCLUDED = ["The verdict and the site score, explained", "The master plan you can edit, with the section", "Site checks: trees, grade, setbacks, existing ADUs", "Build cost, resale value and the deal's return", "The PDF to share with a lender or builder"];

/** The processing state stays up at least this long so a mock payment reads like a real one. */
const MIN_PROCESSING_MS = 1200;
/** The thank-you stays up this long before the report reveals. */
const SUCCESS_REVEAL_MS = 1800;

type Phase = { kind: "form"; error?: "incomplete" } | { kind: "processing" } | { kind: "success"; receipt: Receipt } | { kind: "failed"; reason: string };

/**
 * The second gate over a blurred report. Two options: this one report, or five reports plus the weekly newsletter of
 * the best DADU opportunities in Seattle (five credits in this browser; each new address opened spends one).
 *
 * Test mode. The card fields stand in for Stripe Checkout: they accept anything, are never sent anywhere and are
 * never stored. Submitting posts the address and the product to /api/checkout, which answers with a mock receipt.
 * A card number ending in 0000 asks the mock to decline, so the failure path can be walked.
 * When Stripe is wired up this form is replaced by a redirect to Stripe's hosted page.
 */
export default function ReportPaywall({ address, onUnlock }: { address: string; onUnlock: (receipt: Receipt) => void }) {
  const [product, setProduct] = useState<ProductId>("pack5");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const id = useId();
  const chosen = PRODUCTS[product];

  useEffect(() => {
    if (phase.kind !== "success") return;
    const t = setTimeout(() => onUnlock(phase.receipt), SUCCESS_REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase, onUnlock]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!number.trim() || !expiry.trim() || !cvc.trim()) {
      setPhase({ kind: "form", error: "incomplete" });
      return;
    }
    setPhase({ kind: "processing" });
    const minimumWait = new Promise<void>((r) => setTimeout(r, MIN_PROCESSING_MS));
    // Only the address, the product and (mock) a decline flag cross the wire. The card fields stay here and are dropped on success.
    const simulate = number.replace(/\s/g, "").endsWith("0000") ? "fail" : undefined;
    let next: Phase;
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address, product, simulate }) });
      const json = (await res.json()) as { ok: boolean; receipt?: Receipt; error?: string };
      if (json.ok && json.receipt) {
        const r = json.receipt;
        grantReportPayment(address, r);
        if (r.credits > 1) grantReportCredits(r.credits - 1, r);
        if (PRODUCTS[r.product].newsletter) void subscribeNewsletter();
        setNumber("");
        setExpiry("");
        setCvc("");
        next = { kind: "success", receipt: r };
      } else {
        next = { kind: "failed", reason: json.error === "card_declined" ? "Your card was declined. Try another card." : "Checkout did not go through. Try again in a moment." };
      }
    } catch {
      next = { kind: "failed", reason: "We could not reach checkout. Check your connection and try again." };
    }
    await minimumWait;
    setPhase(next);
  }

  async function subscribeNewsletter() {
    const email = reportAccessEmail();
    if (!email) return;
    try {
      await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, kind: "newsletter", message: "5-report pack: weekly Seattle DADU opportunities", source: window.location.pathname + window.location.search }) });
    } catch {
      /* the purchase stands; the newsletter sign-up can be retried later */
    }
  }

  const field = (invalid: boolean): React.CSSProperties => ({
    background: "var(--bg, #F3F5F2)",
    boxShadow: invalid ? "inset 0 0 0 1.5px var(--red)" : "inset 0 0 0 1px var(--line-strong, #CBD3CE)",
    color: "var(--ink)",
  });
  const incomplete = phase.kind === "form" && phase.error === "incomplete";
  const busy = phase.kind === "processing";

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-h`}
      aria-busy={busy}
      className="w-full max-w-[480px] rounded-2xl p-6 sm:p-7"
      style={{ background: "var(--card, #fff)", boxShadow: "0 1px 2px rgba(23,36,29,.08), 0 24px 60px -24px rgba(23,36,29,.45)" }}
    >
      {phase.kind === "processing" && (
        <div className="flex flex-col items-center py-8 text-center" role="status" aria-live="polite">
          <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--green-tint)", color: "var(--green)" }} aria-hidden>
            <Loader2 size={22} className="animate-spin" />
          </span>
          <h3 id={`${id}-h`} className="pa-display mt-4 text-xl" style={{ color: "var(--ink)" }}>Processing your payment…</h3>
          <p className="mt-1.5 text-sm" style={{ color: "var(--slate)" }}>{chosen.name} · {usd(chosen.amountCents)}. Keep this page open.</p>
        </div>
      )}

      {phase.kind === "success" && (
        <div className="flex flex-col items-center py-6 text-center" role="status" aria-live="polite">
          <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--green-tint)", color: "var(--green)" }} aria-hidden>
            <CircleCheck size={24} />
          </span>
          <h3 id={`${id}-h`} className="pa-display mt-4 text-xl" style={{ color: "var(--ink)" }}>Thank you, payment received</h3>
          <p className="mt-1.5 text-sm" style={{ color: "var(--slate)" }}>Opening your report for {address}…</p>
          <dl className="pa-inset mt-5 w-full p-3 text-left text-sm">
            <div className="flex justify-between gap-3"><dt style={{ color: "var(--slate)" }}>Purchased</dt><dd style={{ color: "var(--ink)" }}>{PRODUCTS[phase.receipt.product].name}</dd></div>
            <div className="mt-1 flex justify-between gap-3"><dt style={{ color: "var(--slate)" }}>Paid</dt><dd className="tabular-nums" style={{ color: "var(--ink)" }}>{usd(phase.receipt.amountCents)}</dd></div>
            {phase.receipt.credits > 1 && <div className="mt-1 flex justify-between gap-3"><dt style={{ color: "var(--slate)" }}>Reports left after this one</dt><dd className="tabular-nums" style={{ color: "var(--ink)" }}>{phase.receipt.credits - 1}</dd></div>}
            <div className="mt-1 flex justify-between gap-3"><dt style={{ color: "var(--slate)" }}>Receipt</dt><dd className="font-mono text-xs" style={{ color: "var(--ink)" }}>{phase.receipt.id}</dd></div>
          </dl>
          {PRODUCTS[phase.receipt.product].newsletter && (
            <p className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: "var(--slate)" }}>
              <Mail size={13} aria-hidden /> You are on the weekly Seattle DADU opportunities newsletter.
            </p>
          )}
          <button type="button" className="pa-btn pa-btn-primary mt-4" onClick={() => onUnlock(phase.receipt)}>
            Open the report <ArrowRight size={15} aria-hidden />
          </button>
        </div>
      )}

      {phase.kind === "failed" && (
        <div className="flex flex-col items-center py-6 text-center" role="alert">
          <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--red-tint)", color: "var(--red)" }} aria-hidden>
            <CircleX size={24} />
          </span>
          <h3 id={`${id}-h`} className="pa-display mt-4 text-xl" style={{ color: "var(--ink)" }}>Payment failed</h3>
          <p className="mt-1.5 text-sm" style={{ color: "var(--slate)" }}>{phase.reason} You have not been charged.</p>
          <button type="button" className="pa-btn pa-btn-primary mt-5" onClick={() => setPhase({ kind: "form" })}>
            Try again
          </button>
        </div>
      )}

      {phase.kind === "form" && (
        <>
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--green-tint)", color: "var(--green)" }} aria-hidden>
              <CreditCard size={18} />
            </span>
            <p className="text-right">
              <span className="pa-display block text-2xl leading-none tabular-nums" style={{ color: "var(--ink)" }}>{usd(chosen.amountCents)}</span>
              <span className="mt-1 block text-[11px]" style={{ color: "var(--slate)" }}>{chosen.credits === 1 ? "one report, yours to keep" : `${chosen.credits} reports, yours to keep`}</span>
            </p>
          </div>
          <h3 id={`${id}-h`} className="pa-display mt-4 text-xl" style={{ color: "var(--ink)" }}>
            Unlock the full report for {address}
          </h3>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
            {INCLUDED.map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" style={{ color: "var(--green)" }} aria-hidden />
                <span>{t}</span>
              </li>
            ))}
          </ul>

          <fieldset className="mt-4 grid grid-cols-2 gap-2" disabled={busy}>
            <legend className="sr-only">Choose what to buy</legend>
            {(["pack5", "single"] as const).map((pid) => {
              const p = PRODUCTS[pid];
              const on = product === pid;
              return (
                <label
                  key={pid}
                  className="relative flex cursor-pointer flex-col rounded-xl p-3 text-left"
                  style={{ background: on ? "var(--green-tint)" : "var(--bg, #F3F5F2)", boxShadow: on ? "inset 0 0 0 2px var(--green)" : "inset 0 0 0 1px var(--line-strong, #CBD3CE)" }}
                >
                  <input type="radio" name={`${id}-product`} value={pid} checked={on} onChange={() => setProduct(pid)} className="sr-only" />
                  {pid === "pack5" && (
                    <span className="absolute -top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white" style={{ background: "var(--green)" }}>
                      Best value
                    </span>
                  )}
                  <span className="pa-display text-lg leading-none tabular-nums" style={{ color: "var(--ink)" }}>{usd(p.amountCents)}</span>
                  <span className="mt-1.5 text-sm font-semibold leading-tight" style={{ color: "var(--ink)" }}>{pid === "pack5" ? "5 feasibility reports" : "This one report"}</span>
                  <span className="mt-1 text-[11px] leading-snug" style={{ color: "var(--slate)" }}>
                    {pid === "pack5" ? "Plus the weekly newsletter of the best DADU opportunities in Seattle." : "Just this address."}
                  </span>
                </label>
              );
            })}
          </fieldset>

          <p className="mt-4 flex items-start gap-2 rounded-[10px] px-3 py-2 text-xs leading-relaxed" style={{ background: "var(--amber-tint)", color: "#7A5A12" }} role="status">
            <FlaskConical size={14} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              <strong>Test mode.</strong> Nothing is charged and card details never leave this page. Any card opens the report; a number ending in 0000 is declined.
            </span>
          </p>

          <form onSubmit={submit} noValidate autoComplete="off" className="mt-4" data-form-type="other">
            <label htmlFor={`${id}-n`} className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Card number</label>
            <input
              id={`${id}-n`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              value={number}
              onChange={(e) => { setNumber(e.target.value); if (incomplete) setPhase({ kind: "form" }); }}
              placeholder="Any number"
              aria-invalid={incomplete && !number.trim()}
              className="mt-1.5 w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
              style={field(incomplete && !number.trim())}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label htmlFor={`${id}-e`} className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Expiry</label>
                <input id={`${id}-e`} type="text" inputMode="numeric" autoComplete="off" data-1p-ignore data-lpignore="true" value={expiry} onChange={(e) => { setExpiry(e.target.value); if (incomplete) setPhase({ kind: "form" }); }} placeholder="MM / YY" aria-invalid={incomplete && !expiry.trim()} className="mt-1.5 w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={field(incomplete && !expiry.trim())} />
              </div>
              <div>
                <label htmlFor={`${id}-c`} className="text-xs font-semibold" style={{ color: "var(--ink)" }}>CVC</label>
                <input id={`${id}-c`} type="text" inputMode="numeric" autoComplete="off" data-1p-ignore data-lpignore="true" value={cvc} onChange={(e) => { setCvc(e.target.value); if (incomplete) setPhase({ kind: "form" }); }} placeholder="123" aria-invalid={incomplete && !cvc.trim()} className="mt-1.5 w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={field(incomplete && !cvc.trim())} />
              </div>
            </div>
            {incomplete && (
              <p role="alert" className="mt-2 text-xs" style={{ color: "var(--red)" }}>
                Fill in all three fields. In test mode any values work.
              </p>
            )}
            <button type="submit" className="pa-btn pa-btn-primary mt-4 w-full" style={{ minHeight: 44 }}>
              Pay {usd(chosen.amountCents)} and open the report
              <ArrowRight size={15} aria-hidden />
            </button>
            <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--slate)" }}>
              Secure checkout by Stripe is coming; until then this is a stand-in and no payment is taken.
            </p>
          </form>
        </>
      )}
    </div>
  );
}
