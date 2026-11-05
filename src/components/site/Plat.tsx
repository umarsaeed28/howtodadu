/**
 * Illustrative plat of a 50' x 100' Seattle lot. Drawn once on load:
 * lot lines trace in, then the buildable envelope and DADU fill.
 * Scale: 4.6px per foot. Not a real parcel.
 */
const PX = 4.6;
const LOT = { x: 170, y: 64, w: 50 * PX, h: 100 * PX }; // 230 x 460

export default function Plat() {
  const lotPerimeter = 2 * (LOT.w + LOT.h);
  return (
    <figure className="plat-sheet" style={{ margin: 0, padding: "clamp(14px, 2.2vw, 24px)" }}>
      <svg
        className="plat"
        viewBox="0 0 560 640"
        role="img"
        aria-label="Illustrative plat of a 50 by 100 foot Seattle lot showing setbacks, a shaded buildable envelope, an existing house, a proposed 28 by 23 foot backyard cottage, two trees with drip lines, and an access path from the street."
      >
        <defs>
          <pattern id="hatch-house" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
          </pattern>
          <pattern id="hatch-eca" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#3D5A6C" strokeOpacity="0.55" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Alley (top) and street (bottom) */}
        <rect x="40" y="18" width="480" height="34" fill="#D6DED9" />
        <text x="280" y="40" textAnchor="middle" className="t-label">Alley</text>
        <rect x="40" y="572" width="480" height="48" fill="#D6DED9" />
        <text x="280" y="602" textAnchor="middle" className="t-label">Street</text>

        {/* Steep slope / ECA corner */}
        <path d={`M ${LOT.x} ${LOT.y} h 70 l -70 70 z`} fill="url(#hatch-eca)" />

        {/* Buildable envelope */}
        <rect
          className="plat-fill"
          style={{ ["--d" as string]: "1.3s" }}
          x={LOT.x + 26} y={LOT.y + 8} width={LOT.w - 52} height={330}
          fill="#1E6E50" fillOpacity="0.18"
        />
        <rect
          className="plat-draw"
          style={{ ["--len" as string]: 1200, ["--d" as string]: "0.9s" }}
          x={LOT.x + 26} y={LOT.y + 8} width={LOT.w - 52} height={330}
          fill="none" stroke="#145A40" strokeWidth="1.5" strokeDasharray="6 4"
        />

        {/* Lot line */}
        <rect
          className="plat-draw"
          style={{ ["--len" as string]: lotPerimeter, ["--d" as string]: "0s" }}
          x={LOT.x} y={LOT.y} width={LOT.w} height={LOT.h}
          fill="none" stroke="currentColor" strokeWidth="2.5"
        />

        {/* Existing house */}
        <g className="plat-fill" style={{ ["--d" as string]: "1.5s", color: "#17241D" }}>
          <rect x={LOT.x + 26} y={LOT.y + 340} width={LOT.w - 52} height={104} fill="url(#hatch-house)" stroke="currentColor" strokeWidth="1.5" />
          <text x={LOT.x + LOT.w / 2} y={LOT.y + 398} textAnchor="middle" className="t-label">Existing house</text>
        </g>

        {/* Proposed DADU */}
        <g className="plat-fill" style={{ ["--d" as string]: "1.7s" }}>
          <rect x={LOT.x + 50} y={LOT.y + 34} width={28 * PX - 12} height={23 * PX - 6} fill="#E6C97E" stroke="#17241D" strokeWidth="2" />
          <text x={LOT.x + 50 + (28 * PX - 12) / 2} y={LOT.y + 34 + (23 * PX - 6) / 2 + 4} textAnchor="middle" className="t-strong">DADU</text>
        </g>

        {/* Trees with drip lines */}
        <g className="plat-fill" style={{ ["--d" as string]: "1.9s" }}>
          <circle cx={LOT.x + 52} cy={LOT.y + 250} r="26" fill="none" stroke="#4E9A6B" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx={LOT.x + 52} cy={LOT.y + 250} r="4" fill="#4E9A6B" />
          <circle cx={LOT.x + 178} cy={LOT.y + 190} r="20" fill="none" stroke="#4E9A6B" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx={LOT.x + 178} cy={LOT.y + 190} r="4" fill="#4E9A6B" />
        </g>

        {/* Access path from street along the east side */}
        <path
          className="plat-draw"
          style={{ ["--len" as string]: 500, ["--d" as string]: "1.6s" }}
          d={`M ${LOT.x + LOT.w - 13} ${LOT.y + LOT.h} V ${LOT.y + 100} H ${LOT.x + 50 + 28 * PX - 12}`}
          fill="none" stroke="#17241D" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round"
        />
        <text x={LOT.x + LOT.w + 10} y={LOT.y + 372} className="t-label">Access</text>
        <text x={LOT.x + LOT.w + 10} y={LOT.y + 386} className="t-label">path</text>

        {/* Keys that match the list beside the drawing */}
        {[
          { n: 1, x: LOT.x + 44, y: LOT.y + 318 },
          { n: 2, x: LOT.x + 50, y: LOT.y + 34 },
          { n: 3, x: LOT.x + 52, y: LOT.y + 212 },
        ].map((k) => (
          <g key={k.n} className="plat-fill" style={{ ["--d" as string]: "2.1s" }}>
            <circle cx={k.x} cy={k.y} r="11" fill="#1E6E50" stroke="#17241D" strokeWidth="1.5" />
            <text x={k.x} y={k.y + 4} textAnchor="middle" className="t-strong" style={{ fill: "#fff" }}>{k.n}</text>
          </g>
        ))}

        {/* Dimension strings */}
        <g stroke="#3D5A6C" strokeWidth="1" fill="none">
          <line x1={LOT.x} y1="548" x2={LOT.x + LOT.w} y2="548" />
          <line x1={LOT.x} y1="542" x2={LOT.x} y2="554" />
          <line x1={LOT.x + LOT.w} y1="542" x2={LOT.x + LOT.w} y2="554" />
          <line x1="132" y1={LOT.y} x2="132" y2={LOT.y + LOT.h} />
          <line x1="126" y1={LOT.y} x2="138" y2={LOT.y} />
          <line x1="126" y1={LOT.y + LOT.h} x2="138" y2={LOT.y + LOT.h} />
        </g>
        <text x={LOT.x + LOT.w / 2} y="540" textAnchor="middle" className="t-dim">50&apos;-0&quot;</text>
        <text x="124" y={LOT.y + LOT.h / 2} textAnchor="middle" className="t-dim" transform={`rotate(-90 124 ${LOT.y + LOT.h / 2})`}>100&apos;-0&quot;</text>

        {/* North arrow */}
        <g transform="translate(486 96)">
          <circle r="22" fill="none" stroke="#17241D" strokeWidth="1.5" />
          <path d="M 0 -16 L 7 10 L 0 5 L -7 10 Z" fill="#17241D" />
          <text y="-28" textAnchor="middle" className="t-strong">N</text>
        </g>

        {/* Scale bar: 20 ft */}
        <g transform="translate(40 622)" />
        <g transform="translate(430 540)">
          <rect x="0" y="0" width={10 * PX} height="6" fill="#17241D" />
          <rect x={10 * PX} y="0" width={10 * PX} height="6" fill="none" stroke="#17241D" />
          <text x="0" y="-5" className="t-label">0</text>
          <text x={20 * PX} y="-5" textAnchor="end" className="t-label">20 ft</text>
        </g>
      </svg>
      <figcaption
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "4px 16px",
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--line)",
          fontSize: "0.82rem",
          color: "var(--slate)",
        }}
      >
        <span>Illustrative 50&apos; × 100&apos; lot, not a real parcel</span>
        <span>Your report draws this for your address</span>
      </figcaption>
    </figure>
  );
}
