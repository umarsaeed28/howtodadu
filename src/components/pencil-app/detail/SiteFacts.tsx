import type { Parcel } from "@/lib/parcels";
import { num } from "@/lib/format";

export default function SiteFacts({ parcel }: { parcel: Parcel }) {
  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: "Zoning", value: parcel.zoning, mono: true },
    { label: "Lot size", value: `${num(parcel.lotSqft)} sqft`, mono: true },
    {
      label: "Transit proximity",
      value: parcel.nearTransit ? "Near frequent transit (6-unit trigger)" : "Not near frequent transit",
    },
    { label: "Units unlocked", value: `${parcel.unitsUnlocked}`, mono: true },
    { label: "Overlays", value: "None on record" },
    { label: "Height / setbacks", value: "Max 3 stories · 5 ft side setbacks (summary)" },
    { label: "Days on market", value: `${parcel.dom} days`, mono: true },
  ];
  return (
    <section>
      <h2 className="pa-display mb-3 text-base">Zoning &amp; site facts</h2>
      <table className="pa-card w-full overflow-hidden text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.label}
              className={i < rows.length - 1 ? "border-b" : ""}
              style={{ borderColor: "var(--hairline)" }}
            >
              <th scope="row" className="px-4 py-2.5 text-left font-normal" style={{ color: "var(--slate)" }}>
                {r.label}
              </th>
              <td className={`px-4 py-2.5 text-right ${r.mono ? "pa-mono" : ""}`}>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
