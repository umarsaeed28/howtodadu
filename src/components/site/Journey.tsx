import { PRODUCTS, price } from "@/lib/pricing";

/**
 * "How it works" as a drawn rail: five small line-art scenes on one connecting line, numbered nodes, a tag
 * and one line of copy each. Pure SVG and CSS, in the plat's drawing language (ink lines, one green).
 */
const G = "#1F7A55";
const GT = "#E6F2EB";
const INK = "#111614";
const SOFT = "#D6DED9";
const AMBER = "#D9A441";

function Acquire() {
  return (
    <svg viewBox="0 0 120 84" role="img" aria-label="A lot found on the map">
      <rect x="10" y="12" width="100" height="60" rx="6" fill="#fff" stroke={INK} strokeOpacity=".25" />
      <path d="M10 40h100M44 12v60M78 12v60" stroke={INK} strokeOpacity=".12" />
      <rect x="47" y="15" width="28" height="22" rx="2" fill={GT} stroke={G} strokeWidth="1.5" />
      <circle cx="61" cy="26" r="13" fill="none" stroke={G} strokeWidth="1.2" strokeDasharray="3 3" />
      <path d="M61 44c-4-5-7-8-7-12a7 7 0 0 1 14 0c0 4-3 7-7 12z" fill={G} />
      <circle cx="61" cy="32" r="2.4" fill="#fff" />
    </svg>
  );
}

function Feasibility() {
  return (
    <svg viewBox="0 0 120 84" role="img" aria-label="A scored site plan with the cottage drawn in">
      <rect x="30" y="8" width="50" height="68" fill="#fff" stroke={INK} strokeOpacity=".5" />
      <rect x="37" y="15" width="36" height="54" fill={GT} stroke={G} strokeWidth="1" strokeDasharray="2 2" />
      <rect x="40" y="46" width="30" height="20" fill="url(#jr-hatch)" stroke={INK} strokeOpacity=".5" />
      <rect x="44" y="18" width="20" height="16" rx="1.5" fill="#F3D27A" stroke={INK} strokeOpacity=".6" />
      <circle cx="68" cy="30" r="5" fill="none" stroke={G} strokeOpacity=".7" strokeDasharray="2 2" />
      <g transform="translate(84 10)">
        <circle cx="12" cy="12" r="12" fill={INK} />
        <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="var(--font-display), system-ui">86</text>
      </g>
      <defs>
        <pattern id="jr-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={INK} strokeOpacity=".35" />
        </pattern>
      </defs>
    </svg>
  );
}

function Permit() {
  return (
    <svg viewBox="0 0 120 84" role="img" aria-label="A permit drawing with an approved stamp">
      <rect x="22" y="8" width="64" height="68" rx="2" fill="#fff" stroke={INK} strokeOpacity=".5" />
      <path d="M30 20h30M30 27h40M30 34h24" stroke={INK} strokeOpacity=".3" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 62l10-14 8 9 7-12 11 17z" fill="none" stroke={INK} strokeOpacity=".5" />
      <rect x="22" y="66" width="64" height="10" fill={SOFT} />
      <g transform="rotate(-12 86 48)">
        <circle cx="86" cy="48" r="17" fill="none" stroke={G} strokeWidth="2.5" />
        <circle cx="86" cy="48" r="13" fill="none" stroke={G} strokeWidth="1" />
        <path d="M78 48l5 5 10-10" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function Build() {
  return (
    <svg viewBox="0 0 120 84" role="img" aria-label="A cottage being framed">
      <path d="M20 76h80" stroke={INK} strokeOpacity=".4" />
      <path d="M32 76V42l28-22 28 22v34" fill="#fff" stroke={INK} strokeOpacity=".7" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M40 76V48M48 76V42M56 76V36M64 76V36M72 76V42M80 76V48M32 60h56" stroke={G} strokeWidth="1.5" />
      <path d="M26 46l34-27 34 27" fill="none" stroke={INK} strokeOpacity=".7" strokeWidth="2" strokeLinejoin="round" />
      <path d="M96 14v28M90 14h18M90 14l-8 8" stroke={INK} strokeOpacity=".5" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="6" y="66" width="18" height="10" rx="1" fill={AMBER} stroke={INK} strokeOpacity=".4" />
    </svg>
  );
}

function Keys() {
  return (
    <svg viewBox="0 0 120 84" role="img" aria-label="A finished cottage with keys and a rent sign">
      <path d="M14 76h92" stroke={INK} strokeOpacity=".4" />
      <path d="M30 76V44l24-18 24 18v32z" fill={GT} stroke={INK} strokeOpacity=".7" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="48" y="56" width="12" height="20" fill="#fff" stroke={INK} strokeOpacity=".6" />
      <rect x="36" y="50" width="8" height="8" fill="#fff" stroke={INK} strokeOpacity=".6" />
      <rect x="64" y="50" width="8" height="8" fill="#fff" stroke={INK} strokeOpacity=".6" />
      <g transform="translate(86 10)">
        <circle cx="8" cy="8" r="7" fill="none" stroke={G} strokeWidth="2.5" />
        <path d="M13 13l12 12M21 21l4-4M17 17l4-4" stroke={G} strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g transform="translate(8 40)">
        <path d="M10 36V12" stroke={INK} strokeOpacity=".6" strokeWidth="1.5" />
        <rect x="0" y="4" width="20" height="12" rx="1.5" fill="#fff" stroke={INK} strokeOpacity=".6" />
        <text x="10" y="12.5" textAnchor="middle" fontSize="6.5" fontWeight="700" fill={G} fontFamily="var(--font-body), system-ui">RENT</text>
      </g>
    </svg>
  );
}

function Paths() {
  return (
    <svg viewBox="0 0 120 84" role="img" aria-label="Two paths: a city-reviewed plan or a custom footprint">
      <rect x="10" y="12" width="44" height="60" rx="3" fill="#fff" stroke={INK} strokeOpacity=".5" />
      <rect x="18" y="22" width="28" height="22" fill={GT} stroke={G} strokeWidth="1.2" />
      <path d="M18 52h28M18 58h20" stroke={INK} strokeOpacity=".25" strokeWidth="2" strokeLinecap="round" />
      <circle cx="46" cy="16" r="7" fill={G} />
      <path d="M43 16l2 2 4-4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="66" y="12" width="44" height="60" rx="3" fill="#fff" stroke={INK} strokeOpacity=".5" />
      <path d="M74 28h22v26H74z" fill="none" stroke={G} strokeWidth="1.4" strokeDasharray="3 2" />
      <path d="M96 54l8-8 4 4-8 8h-4z" fill={AMBER} stroke={INK} strokeOpacity=".5" />
    </svg>
  );
}

function Plans() {
  return (
    <svg viewBox="0 0 120 84" role="img" aria-label="A floor plan being drafted and refined">
      <rect x="18" y="8" width="70" height="68" rx="2" fill="#fff" stroke={INK} strokeOpacity=".5" />
      <path d="M28 18h50v48H28z" fill="none" stroke={INK} strokeWidth="2" strokeOpacity=".75" />
      <path d="M28 40h22M50 18v22M60 40h18M60 40v26" stroke={INK} strokeWidth="1.4" strokeOpacity=".6" />
      <rect x="31" y="21" width="16" height="16" fill={GT} />
      <rect x="63" y="43" width="12" height="20" fill={GT} />
      <path d="M52 52h6M52 56h6M52 60h6" stroke={G} strokeWidth="1.4" />
      <path d="M92 60l14-30 4 2-14 30-5 2z" fill={AMBER} stroke={INK} strokeOpacity=".5" />
    </svg>
  );
}

export type JourneyStep = { Art: () => React.ReactElement; title: string; tag?: string; body: string };

/** Pencil's service end to end, acquisition to construction. Prices come from the one price list. */
const STEPS: JourneyStep[] = [
  { Art: Acquire, title: "Acquisition", tag: "Your lot or ours", body: "We find a Seattle lot that takes a DADU and help you buy it, or start from the one you own." },
  { Art: Feasibility, title: "Feasibility", tag: "Free first look", body: "What fits, where it goes, and whether the numbers work, before you commit." },
  { Art: Plans, title: "Design", tag: "City-reviewed or custom", body: "A pre-approved plan, or a custom design for your lot finished by our architects." },
  { Art: Permit, title: "Permit", tag: `${price(PRODUCTS.permit.amountCents)} fixed`, body: "We submit to SDCI and handle every round of corrections." },
  { Art: Build, title: "Construction", tag: "Vetted builders", body: "Bids side by side, then one tracker from groundbreaking to final inspection." },
];

export const ART = { Acquire, Feasibility, Paths, Plans, Permit, Build, Keys };

export default function Journey({ tone = "light", steps = STEPS, label = "Acquisition to construction, in five stages" }: { tone?: "light" | "dark"; steps?: JourneyStep[]; label?: string }) {
  return (
    <ol className={`jr${tone === "dark" ? " jr--dark" : ""}`} data-n={steps.length} aria-label={label}>
      {steps.map(({ Art, title, tag, body }, i) => (
        <li key={title} className="jr-step">
          <div className="jr-art">
            <Art />
          </div>
          <div className="jr-node" aria-hidden>
            <span>{i + 1}</span>
          </div>
          <div className="jr-text">
            <h3 className="s-h3">
              <span className="sr-only">Step {i + 1}: </span>
              {title}
            </h3>
            {tag && <span className="s-pill jr-tag">{tag}</span>}
            <p className="s-body">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
