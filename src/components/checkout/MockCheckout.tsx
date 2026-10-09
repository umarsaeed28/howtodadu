"use client";

import { useId, useState } from "react";
import { ArrowRight, CircleCheck, CircleX, FlaskConical, Loader2 } from "lucide-react";
import type { Receipt } from "@/lib/payments";
import { PRODUCTS, price, type ProductKind } from "@/lib/pricing";
import { EMAIL_RE, lastEmail, rememberEmail, rememberOrder } from "@/lib/report-access";
import { track } from "@/lib/analytics";

/** The processing state stays up at least this long so a mock payment reads like a real one. */
const MIN_PROCESSING_MS = 1200;

type Phase = { kind: "form"; error?: "incomplete" | "email" } | { kind: "processing" } | { kind: "success"; receipt: Receipt } | { kind: "failed"; reason: string };

export type CheckoutProps = {
  /** One product, or two to choose between (the feasibility tiers). */
  kinds: ProductKind[];
  defaultKind?: ProductKind;
  pin: string | null;
  address: string;
  title: string;
  microcopy: string;
  /** Sent with the order (plan id, footprint, draft...). Never card data. */
  meta?: Record<string, unknown>;
  /** The heading and a line after payment. */
  success: (r: Receipt) => { title: string; body: string };
  successCta?: string;
  onDone: (r: Receipt, email: string) => void;
};

/**
 * Checkout card for every product. Test mode: the card fields stand in for Stripe Checkout. They accept anything,
 * are never sent anywhere and never stored; a number ending in 0000 asks the mock to decline so the failure path
 * can be walked. Only the product, the email and the parcel cross the wire, to /api/checkout.
 * TODO(payment): with Stripe, submit creates the session and redirects instead of showing card fields.
 */
export default function MockCheckout({ kinds, defaultKind, pin, address, title, microcopy, meta, success, successCta = "Continue", onDone }: CheckoutProps) {
  const [kind, setKind] = useState<ProductKind>(defaultKind && kinds.includes(defaultKind) ? defaultKind : kinds[0]);
  // Prefilled with the email this browser last bought with. The card only renders after a user action, never on the server.
  const [email, setEmail] = useState(() => (typeof window === "undefined" ? "" : lastEmail()));
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const id = useId();
  const chosen = PRODUCTS[kind];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setPhase({ kind: "form", error: "email" });
    if (!number.trim() || !expiry.trim() || !cvc.trim()) return setPhase({ kind: "form", error: "incomplete" });
    setPhase({ kind: "processing" });
    const wait = new Promise<void>((r) => setTimeout(r, MIN_PROCESSING_MS));
    const simulate = number.replace(/\s/g, "").endsWith("0000") ? "fail" : undefined;
    let next: Phase;
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, email: email.trim(), pin, address, simulate, meta }) });
      const json = (await res.json()) as { ok: boolean; receipt?: Receipt; error?: string };
      if (json.ok && json.receipt) {
        const r = json.receipt;
        rememberEmail(email);
        rememberOrder({ orderId: r.orderId, token: r.token, kind: r.kind, key: pin || address, at: r.at, dueDate: r.dueDate });
        setNumber("");
        setExpiry("");
        setCvc("");
        next = { kind: "success", receipt: r };
      } else {
        const reason =
          json.error === "card_declined" ? "Your card was declined. Try another card."
          : json.error === "sign_in_required" ? "Sign in first, so your permit files stay private to you."
          : "Checkout did not go through. Try again in a moment.";
        next = { kind: "failed", reason };
      }
    } catch {
      next = { kind: "failed", reason: "We could not reach checkout. Check your connection and try again." };
    }
    await wait;
    setPhase(next);
  }

  const busy = phase.kind === "processing";
  const err = phase.kind === "form" ? phase.error : undefined;

  if (phase.kind === "processing") {
    return (
      <div className="ck" role="status" aria-live="polite" aria-busy>
        <span className="ck-icon" aria-hidden><Loader2 size={22} className="animate-spin" /></span>
        <h3 className="ck-title">Processing your payment…</h3>
        <p className="ck-sub">{chosen.name} · {price(chosen.amountCents)}. Keep this page open.</p>
      </div>
    );
  }
  if (phase.kind === "success") {
    const s = success(phase.receipt);
    return (
      <div className="ck ck--center" role="status" aria-live="polite">
        <span className="ck-icon" aria-hidden><CircleCheck size={24} /></span>
        <h3 className="ck-title">{s.title}</h3>
        <p className="ck-sub">{s.body}</p>
        <dl className="ck-receipt">
          <div><dt>Purchased</dt><dd>{chosen.name}</dd></div>
          <div><dt>Paid</dt><dd>{price(phase.receipt.amountCents)}</dd></div>
          <div><dt>Receipt</dt><dd className="ck-mono">{phase.receipt.orderId.slice(0, 8)}</dd></div>
        </dl>
        <button type="button" className="s-btn s-btn--primary" onClick={() => onDone(phase.receipt, email.trim())}>
          {successCta} <ArrowRight size={15} aria-hidden />
        </button>
      </div>
    );
  }
  if (phase.kind === "failed") {
    return (
      <div className="ck ck--center" role="alert">
        <span className="ck-icon ck-icon--bad" aria-hidden><CircleX size={24} /></span>
        <h3 className="ck-title">Payment failed</h3>
        <p className="ck-sub">{phase.reason} You have not been charged.</p>
        <button type="button" className="s-btn s-btn--primary" onClick={() => setPhase({ kind: "form" })}>Try again</button>
      </div>
    );
  }

  const input = (bad: boolean) => `ck-input${bad ? " ck-input--bad" : ""}`;
  return (
    <form className="ck" onSubmit={submit} noValidate autoComplete="off" data-form-type="other" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="ck-title">{title}</h3>

      {kinds.length > 1 && (
        <fieldset className="ck-tiers" disabled={busy}>
          <legend className="sr-only">Choose a report</legend>
          {kinds.map((k) => {
            const p = PRODUCTS[k];
            const on = kind === k;
            return (
              <label key={k} className="ck-tier" data-on={on || undefined}>
                <input type="radio" name={`${id}-tier`} value={k} checked={on} onChange={() => { setKind(k); track("paywall_tier_clicked", { tier: k }); }} className="sr-only" />
                {p.popular && <span className="ck-badge">Most popular</span>}
                <span className="ck-tier-name">{k === "feasibility_instant" ? "Instant report" : k === "feasibility_reviewed" ? "Architect-reviewed" : p.name}</span>
                <span className="ck-tier-price">{price(p.amountCents)}</span>
                <span className="ck-tier-when">{p.turnaround}</span>
              </label>
            );
          })}
        </fieldset>
      )}
      {kinds.length === 1 && (
        <p className="ck-single"><span>{chosen.name}</span><strong>{price(chosen.amountCents)}</strong></p>
      )}

      <label htmlFor={`${id}-email`} className="ck-label">Email for your receipt</label>
      <input id={`${id}-email`} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); if (err) setPhase({ kind: "form" }); }} className={input(err === "email")} placeholder="you@example.com" aria-invalid={err === "email"} />

      <p className="ck-test" role="note">
        <FlaskConical size={14} aria-hidden />
        <span><strong>Test mode.</strong> Nothing is charged and card details never leave this page. Any card works; a number ending in 0000 is declined.</span>
      </p>

      <label htmlFor={`${id}-n`} className="ck-label">Card number</label>
      <input id={`${id}-n`} type="text" inputMode="numeric" autoComplete="off" data-1p-ignore data-lpignore="true" value={number} onChange={(e) => { setNumber(e.target.value); if (err) setPhase({ kind: "form" }); }} placeholder="Any number" className={input(err === "incomplete" && !number.trim())} />
      <div className="ck-row">
        <div>
          <label htmlFor={`${id}-e`} className="ck-label">Expiry</label>
          <input id={`${id}-e`} type="text" inputMode="numeric" autoComplete="off" data-1p-ignore data-lpignore="true" value={expiry} onChange={(e) => { setExpiry(e.target.value); if (err) setPhase({ kind: "form" }); }} placeholder="MM / YY" className={input(err === "incomplete" && !expiry.trim())} />
        </div>
        <div>
          <label htmlFor={`${id}-c`} className="ck-label">CVC</label>
          <input id={`${id}-c`} type="text" inputMode="numeric" autoComplete="off" data-1p-ignore data-lpignore="true" value={cvc} onChange={(e) => { setCvc(e.target.value); if (err) setPhase({ kind: "form" }); }} placeholder="123" className={input(err === "incomplete" && !cvc.trim())} />
        </div>
      </div>
      {err && <p role="alert" className="ck-err">{err === "email" ? "Enter the email for your receipt." : "Fill in all three card fields. In test mode any values work."}</p>}

      <button type="submit" className="s-btn s-btn--primary ck-pay">Pay {price(chosen.amountCents)} <ArrowRight size={15} aria-hidden /></button>
      <p className="ck-micro">{microcopy}</p>
    </form>
  );
}
