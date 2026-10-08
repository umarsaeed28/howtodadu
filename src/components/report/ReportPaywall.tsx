"use client";

import { useId, useState } from "react";
import { ArrowRight, Check, CreditCard, FlaskConical, Loader2 } from "lucide-react";
import { REPORT_PRICE_CENTS, type Receipt } from "@/lib/payments";
import { grantReportPayment } from "@/lib/report-access";

const price = `$${(REPORT_PRICE_CENTS / 100).toLocaleString("en-US", { minimumFractionDigits: REPORT_PRICE_CENTS % 100 ? 2 : 0 })}`;

const INCLUDED = ["The verdict and the site score, explained", "The master plan you can edit, with the section", "Site checks: trees, grade, setbacks, existing ADUs", "Build cost, resale value and the deal's return", "The PDF to share with a lender or builder"];

/**
 * The second gate over a blurred report: one payment opens this address's full report in this browser.
 *
 * Test mode. The card fields are a stand-in for Stripe Checkout: they accept anything, are never sent anywhere and are
 * never stored. Submitting posts the address alone to /api/checkout, which answers with a mock receipt.
 * When Stripe is wired up this form is replaced by a redirect to Stripe's hosted page.
 */
export default function ReportPaywall({ address, onUnlock }: { address: string; onUnlock: (receipt: Receipt) => void }) {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "incomplete" | "failed">("idle");
  const id = useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!number.trim() || !expiry.trim() || !cvc.trim()) {
      setState("incomplete");
      return;
    }
    setState("loading");
    try {
      // The address is the whole request. Card fields stay in this component's state and are dropped on unlock.
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address }) });
      const json = (await res.json()) as { ok: boolean; receipt?: Receipt };
      if (!json.ok || !json.receipt) {
        setState("failed");
        return;
      }
      grantReportPayment(address, json.receipt);
      setNumber("");
      setExpiry("");
      setCvc("");
      onUnlock(json.receipt);
    } catch {
      setState("failed");
    }
  }

  const field = (invalid: boolean): React.CSSProperties => ({
    background: "var(--bg, #F3F5F2)",
    boxShadow: invalid ? "inset 0 0 0 1.5px var(--red)" : "inset 0 0 0 1px var(--line-strong, #CBD3CE)",
    color: "var(--ink)",
  });
  const incomplete = state === "incomplete";

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-h`}
      className="w-full max-w-[460px] rounded-2xl p-6 sm:p-7"
      style={{ background: "var(--card, #fff)", boxShadow: "0 1px 2px rgba(23,36,29,.08), 0 24px 60px -24px rgba(23,36,29,.45)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--green-tint)", color: "var(--green)" }} aria-hidden>
          <CreditCard size={18} />
        </span>
        <p className="text-right">
          <span className="pa-display block text-2xl leading-none tabular-nums" style={{ color: "var(--ink)" }}>{price}</span>
          <span className="mt-1 block text-[11px]" style={{ color: "var(--slate)" }}>one report, yours to keep</span>
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

      <p className="mt-4 flex items-start gap-2 rounded-[10px] px-3 py-2 text-xs leading-relaxed" style={{ background: "var(--amber-tint)", color: "#7A5A12" }} role="status">
        <FlaskConical size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          <strong>Test mode.</strong> Nothing is charged and card details never leave this page. Any card opens the report.
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
          onChange={(e) => { setNumber(e.target.value); if (incomplete) setState("idle"); }}
          placeholder="Any number"
          aria-invalid={incomplete && !number.trim()}
          className="mt-1.5 w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
          style={field(incomplete && !number.trim())}
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`${id}-e`} className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Expiry</label>
            <input id={`${id}-e`} type="text" inputMode="numeric" autoComplete="off" data-1p-ignore data-lpignore="true" value={expiry} onChange={(e) => { setExpiry(e.target.value); if (incomplete) setState("idle"); }} placeholder="MM / YY" aria-invalid={incomplete && !expiry.trim()} className="mt-1.5 w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={field(incomplete && !expiry.trim())} />
          </div>
          <div>
            <label htmlFor={`${id}-c`} className="text-xs font-semibold" style={{ color: "var(--ink)" }}>CVC</label>
            <input id={`${id}-c`} type="text" inputMode="numeric" autoComplete="off" data-1p-ignore data-lpignore="true" value={cvc} onChange={(e) => { setCvc(e.target.value); if (incomplete) setState("idle"); }} placeholder="123" aria-invalid={incomplete && !cvc.trim()} className="mt-1.5 w-full rounded-[10px] px-3 py-2.5 text-sm outline-none" style={field(incomplete && !cvc.trim())} />
          </div>
        </div>
        {incomplete && (
          <p role="alert" className="mt-2 text-xs" style={{ color: "var(--red)" }}>
            Fill in all three fields. In test mode any values work.
          </p>
        )}
        {state === "failed" && (
          <p role="alert" className="mt-2 text-xs" style={{ color: "var(--red)" }}>
            Checkout did not go through. Try again in a moment.
          </p>
        )}
        <button type="submit" className="pa-btn pa-btn-primary mt-4 w-full" disabled={state === "loading"} style={{ minHeight: 44 }}>
          {state === "loading" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
          {state === "loading" ? "Opening…" : `Pay ${price} and open the report`}
          {state === "loading" ? null : <ArrowRight size={15} aria-hidden />}
        </button>
        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--slate)" }}>
          Secure checkout by Stripe is coming; until then this is a stand-in and no payment is taken.
        </p>
      </form>
    </div>
  );
}
