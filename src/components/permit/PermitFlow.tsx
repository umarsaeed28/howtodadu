"use client";

import { useEffect, useId, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, FileUp, Link2, Loader2 } from "lucide-react";
import MockCheckout from "@/components/checkout/MockCheckout";
import { submitPermitIntake } from "@/app/permit/actions";
import { isPin, prettyAddress, readParcel } from "@/lib/parcel-context";
import { ordersFor, type OwnedOrder } from "@/lib/report-access";
import { PRODUCTS } from "@/lib/pricing";
import { track } from "@/lib/analytics";
import type { Receipt } from "@/lib/payments";

type Step = "pay" | "intake" | "done";

/**
 * Start a permit: pay the fixed fee, then the intake (parcel, plans, owner). The tracker for projects already
 * underway is drawn by the page above this. TODO(payment): Stripe Checkout replaces the test card.
 */
export default function PermitFlow({ email }: { email: string }) {
  const search = useSearchParams();
  const router = useRouter();
  const [parcel, setParcel] = useState<{ pin: string; address: string }>({ pin: "", address: "" });
  const [step, setStep] = useState<Step>("pay");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [pencilPlans, setPencilPlans] = useState<OwnedOrder[]>([]);

  useEffect(() => {
    const p = readParcel(search ?? undefined);
    if (!p) return;
    setParcel({ pin: p.pin, address: p.address ? prettyAddress(p.address) : "" });
    setPencilPlans(ordersFor(p.pin, p.address).filter((o) => o.kind === "custom_plan" || o.kind === "plan_request"));
    if (!p.address && isPin(p.pin))
      fetch(`/api/parcel?pin=${p.pin}`).then((r) => (r.ok ? r.json() : null)).then((x: { address?: string } | null) => x?.address && setParcel({ pin: p.pin, address: prettyAddress(x.address) })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  return (
    <div className="pf">
      <ol className="cs-steps" aria-label="Steps">
        {(["Pay the fixed fee", "Project intake", "Track your permit"] as const).map((s, i) => {
          const at = step === "pay" ? 0 : step === "intake" ? 1 : 2;
          return (
            <li key={s} data-state={i < at ? "done" : i === at ? "now" : "next"} aria-current={i === at ? "step" : undefined}>
              <span aria-hidden>{i < at ? <Check size={13} strokeWidth={3} /> : i + 1}</span> {s}
            </li>
          );
        })}
      </ol>

      {step === "pay" && (
        <MockCheckout
          kinds={["permit"]}
          pin={isPin(parcel.pin) ? parcel.pin : null}
          address={parcel.address || "Address to confirm at intake"}
          title={PRODUCTS.permit.name}
          microcopy="One fixed fee, from SDCI submission to issued permit."
          successCta="Start the intake"
          success={() => ({ title: "Thank you. Your permit service is booked.", body: "Next, a few details so we can get your project ready for the city." })}
          onDone={(r) => {
            track("permit_checkout", {});
            setReceipt(r);
            setStep("intake");
          }}
        />
      )}

      {step === "intake" && receipt && (
        <Intake
          orderId={receipt.orderId}
          parcel={parcel}
          email={email}
          pencilPlans={pencilPlans}
          onDone={() => {
            setStep("done");
            router.refresh();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {step === "done" && (
        <section className="cs-done" aria-live="polite">
          <span className="ck-icon" aria-hidden><Check size={24} /></span>
          <h2 className="pd-h2">Your project is with us.</h2>
          <p className="pd-sub">We will prepare the permit set and submit it to SDCI. Your tracker is at the top of this page, and we email you at every step.</p>
        </section>
      )}
    </div>
  );
}

function Intake({ orderId, parcel, email, pencilPlans, onDone }: { orderId: string; parcel: { pin: string; address: string }; email: string; pencilPlans: OwnedOrder[]; onDone: () => void }) {
  const [source, setSource] = useState<"pencil" | "upload">(pencilPlans.length ? "pencil" : "upload");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const id = useId();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("order_id", orderId);
    fd.set("plan_source", source);
    if (source === "upload" && !file) return setErr("Upload your plan set, or pick a Pencil plan.");
    setBusy(true);
    setErr(null);
    const r = await submitPermitIntake(fd);
    if (r.error || !r.projectId) {
      setBusy(false);
      return setErr(r.error ?? "The intake did not go through.");
    }
    if (source === "upload" && file) {
      const up = new FormData();
      up.set("project_id", r.projectId);
      up.set("kind", "drawing");
      up.set("file", file);
      const res = await fetch("/api/portal/files", { method: "POST", body: up }).catch(() => null);
      if (!res?.ok) setErr("Your intake is in, but the plan upload failed. Add it from your dashboard.");
    }
    setBusy(false);
    onDone();
  }

  return (
    <form className="pd-req" onSubmit={submit} noValidate aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="pd-h2">Let&apos;s get your project ready for the city.</h2>

      <fieldset className="pf-group">
        <legend className="pd-k">1. Confirm the parcel</legend>
        <input type="hidden" name="pin" value={parcel.pin} />
        <label className="ck-label" htmlFor={`${id}-addr`}>Property address
          <input id={`${id}-addr`} name="address" className="ck-input" defaultValue={parcel.address} placeholder="1234 N 45th St, Seattle" autoComplete="street-address" required />
        </label>
        {parcel.pin && <p className="cs-hint">King County parcel {parcel.pin}</p>}
      </fieldset>

      <fieldset className="pf-group">
        <legend className="pd-k">2. Your plans</legend>
        <div className="pf-choices" role="radiogroup" aria-label="Where the plans come from">
          <label className="pd-size" data-on={source === "pencil" || undefined}>
            <input type="radio" name="src" checked={source === "pencil"} onChange={() => setSource("pencil")} className="sr-only" />
            <span className="pd-size-name"><Link2 size={15} aria-hidden /> A Pencil plan</span>
            <span className="pd-size-sf">{pencilPlans.length ? `${pencilPlans.length} on this lot` : "A custom or requested plan"}</span>
          </label>
          <label className="pd-size" data-on={source === "upload" || undefined}>
            <input type="radio" name="src" checked={source === "upload"} onChange={() => setSource("upload")} className="sr-only" />
            <span className="pd-size-name"><FileUp size={15} aria-hidden /> Upload a plan set</span>
            <span className="pd-size-sf">PDF, DWG or ZIP, up to 25 MB</span>
          </label>
        </div>
        {source === "pencil" ? (
          pencilPlans.length ? (
            <label className="ck-label" htmlFor={`${id}-plan`}>Which plan
              <select id={`${id}-plan`} name="plan_ref" className="ck-input">
                {pencilPlans.map((o) => <option key={o.orderId} value={o.orderId}>{o.kind === "custom_plan" ? "Custom DADU Plan" : "Requested plan"} · order {o.orderId.slice(0, 8)}</option>)}
              </select>
            </label>
          ) : (
            <label className="ck-label" htmlFor={`${id}-ref`}>Order number or plan name
              <input id={`${id}-ref`} name="plan_ref" className="ck-input" placeholder="From your Pencil receipt" />
            </label>
          )
        ) : (
          <label className="ck-label" htmlFor={`${id}-file`}>Plan set
            <input id={`${id}-file`} type="file" className="ck-input pf-file" accept=".pdf,.dwg,.zip,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        )}
      </fieldset>

      <fieldset className="pf-group">
        <legend className="pd-k">3. Owner</legend>
        <div className="pd-grid">
          <label className="ck-label" htmlFor={`${id}-on`}>Owner name (as on title)<input id={`${id}-on`} name="owner_name" className="ck-input" autoComplete="name" required /></label>
          <label className="ck-label" htmlFor={`${id}-op`}>Phone<input id={`${id}-op`} name="owner_phone" type="tel" className="ck-input" autoComplete="tel" /></label>
          <label className="ck-label" htmlFor={`${id}-om`}>Mailing address<input id={`${id}-om`} name="owner_mailing" className="ck-input" autoComplete="street-address" placeholder="If different from the property" /></label>
        </div>
        <p className="cs-hint">Updates go to {email}.</p>
        <label className="plf-toggle">
          <input type="checkbox" name="owner_confirm" />
          I own this property, or the owner has authorized me to apply.
        </label>
      </fieldset>

      {err && <p role="alert" className="ck-err">{err}</p>}
      <button type="submit" className="s-btn s-btn--primary pd-send" disabled={busy}>
        {busy && <Loader2 size={15} className="animate-spin" aria-hidden />} Send to Pencil
      </button>
    </form>
  );
}
