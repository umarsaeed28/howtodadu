import Link from "next/link";
import { ArrowRight, ClipboardCheck, Hammer, KeyRound, MapPin, Ruler } from "lucide-react";

const STEPS = [
  { Icon: MapPin, title: "Acquire", text: "Your lot, or we find one" },
  { Icon: Ruler, title: "Feasibility", text: "Free score and site plan" },
  { Icon: ClipboardCheck, title: "Permit", text: "Design, drawings, city approval" },
  { Icon: Hammer, title: "Build", text: "Vetted builders, tracked to CO" },
  { Icon: KeyRound, title: "Sell or rent", text: "Priced, listed or leased" },
];

/** "610 N 125TH ST 98133" (the parcel's form) or a listing address → "610 N 125th St, Seattle, WA". */
export function projectAddress(raw: string): string {
  const street = raw.split(",")[0].replace(/\s+\d{5}(-\d{4})?\s*$/, "").trim();
  const cased = street.replace(/[A-Za-z]+/g, (w) => (/^(N|S|E|W|NE|NW|SE|SW)$/i.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).replace(/(\d)(St|Nd|Rd|Th)\b/g, (_, d, suf) => d + suf.toLowerCase());
  return `${cased}, Seattle, WA`;
}

/**
 * Under every feasibility: Pencil does the whole DADU, acquisition through sale or rent. One button starts a
 * project in the portal with this address filled in (sign-in comes first for visitors).
 */
export default function StartProjectCta({ address, compact }: { address: string; compact?: boolean }) {
  const href = `/portal/new?address=${encodeURIComponent(projectAddress(address))}`;
  return (
    <section className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--ink)", color: "#fff" }} aria-labelledby="start-h">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,.65)" }}>Pencil does the whole thing</p>
      <h3 id="start-h" className="pa-display mt-1 text-2xl">Start your DADU project</h3>
      <p className="mt-1 max-w-2xl text-sm" style={{ color: "rgba(255,255,255,.8)" }}>
        From the lot to the keys: we pull the parcel, design and permit the DADU, match you with a builder, track the build, then help you sell it or rent it.
      </p>
      {!compact && (
        <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title} className="rounded-xl px-3 py-3" style={{ background: "rgba(255,255,255,.08)" }}>
              <Icon size={16} aria-hidden style={{ color: "#8FD3B0" }} />
              <p className="mt-1.5 text-sm font-semibold"><span className="sr-only">Step {i + 1}: </span>{title}</p>
              <p className="text-[11px] leading-snug" style={{ color: "rgba(255,255,255,.7)" }}>{text}</p>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href={href} className="pa-btn pa-btn-primary no-underline">
          Start my project <ArrowRight size={15} aria-hidden />
        </Link>
        <span className="text-xs" style={{ color: "rgba(255,255,255,.7)" }}>Free to start. Fixed fee for the permit package.</span>
      </div>
    </section>
  );
}
