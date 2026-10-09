"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import AddressAutocomplete from "@/components/search/AddressAutocomplete";
import { track, type FunnelEvent } from "@/lib/analytics";

/** A link that records one funnel event when clicked. Styled by the caller. */
export function TrackedLink<E extends FunnelEvent>({ href, event, props, className, children, ariaLabel }: { href: string; event: E["name"]; props: E["props"]; className?: string; children: React.ReactNode; ariaLabel?: string }) {
  return (
    <Link href={href} className={className} aria-label={ariaLabel} onClick={() => track(event, props)}>
      {children}
    </Link>
  );
}

const TERMS = {
  DADU: "Detached Accessory Dwelling Unit: a backyard cottage.",
  FAR: "Floor Area Ratio: how much building your lot allows.",
} as const;

/**
 * A jargon word with its definition: dotted underline, definition on hover, keyboard focus or tap.
 * The definition is always in the accessibility tree (aria-describedby), so screen readers get it too.
 */
export function Term({ word }: { word: keyof typeof TERMS }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="term" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="term-word" aria-describedby={id} aria-expanded={open} onClick={() => setOpen((v) => !v)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
        {word}
      </button>
      <span role="tooltip" id={id} className="term-tip" data-open={open}>
        {TERMS[word]}
      </span>
    </span>
  );
}

/**
 * An address box that opens the feasibility check for that address, with Seattle autocomplete. Used in the hero
 * and the footer CTA. Picking a suggestion starts the check at once. Records the hero CTA click and the address
 * submission; the address itself is never sent to analytics.
 */
export function AddressForm({ source, label, placeholder = "Enter your Seattle address", size = "lg" }: { source: "hero" | "footer_cta"; label: string; placeholder?: string; size?: "lg" | "xl" }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const id = useId();
  const go = (raw: string) => {
    const a = raw.trim();
    if (a.length < 5) return setErr("Enter a Seattle street address, like 1234 N 45th St.");
    if (source === "hero") track("hero_cta_click", { cta: "check_my_lot" });
    track("address_submitted", { source });
    router.push(`/feasibility?address=${encodeURIComponent(/seattle/i.test(a) ? a : `${a}, Seattle, WA`)}`);
  };
  return (
    <form className={`fa fa--${size}`} onSubmit={(e) => { e.preventDefault(); go(value); }} noValidate>
      <div className="fa-row">
        <AddressAutocomplete value={value} onChange={(v) => { setValue(v); setErr(null); }} onPick={go} label={label} placeholder={placeholder} invalid={!!err} describedBy={err ? `${id}-err` : undefined} />
        <button type="submit" className="s-btn s-btn--primary s-btn--lg">Check my lot <ArrowRight size={16} aria-hidden /></button>
      </div>
      {err && <p id={`${id}-err`} role="alert" className="fa-err">{err}</p>}
    </form>
  );
}
