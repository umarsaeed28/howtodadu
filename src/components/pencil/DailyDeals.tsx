import { Check } from "lucide-react";
import { digestRows } from "@/lib/sampleParcels";
import { Reveal } from "./Reveal";
import { EmailCapture } from "./EmailCapture";

export function DailyDeals() {
  return (
    <section
      id="daily-deals"
      aria-labelledby="daily-deals-heading"
      className="pencil-grid-bg"
      style={{ borderBottom: "1px solid var(--hairline)" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
        <Reveal className="grid grid-cols-1 gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="pencil-eyebrow">The daily deals</p>
            <h2 id="daily-deals-heading" className="pencil-h2 mt-4 max-w-[16ch] text-[var(--ink)]">
              Every morning, the lots that pencil — ranked.
            </h2>
            <p className="mt-5 max-w-[46ch] text-[1.0625rem] leading-[1.65] text-[var(--slate)]">
              Pencil scans new Puget Sound listings overnight, runs each one through the full
              feasibility, and sends you only the deals that work — sorted by margin. Stop hunting
              listings. Start underwriting.
            </p>

            <div className="mt-8">
              <EmailCapture />
            </div>
          </div>

          {/* Mock morning digest */}
          <div className="pencil-card overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid var(--hairline)" }}
            >
              <span className="pencil-mono text-[0.72rem] uppercase tracking-[0.12em] text-[var(--blue)]">
                Pencil · daily deals
              </span>
              <span className="pencil-mono text-[0.72rem] uppercase tracking-[0.12em] text-[var(--slate)]">
                Tue · 6:00 AM
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] border-collapse text-left">
                <caption className="sr-only">
                  Sample Daily Deals digest: address, zoning unlock, unit yield, and projected margin.
                </caption>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <th scope="col" className="pencil-mono px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.1em] text-[var(--slate)]">
                      Address
                    </th>
                    <th scope="col" className="pencil-mono px-3 py-2.5 text-[0.68rem] uppercase tracking-[0.1em] text-[var(--slate)]">
                      Unlock
                    </th>
                    <th scope="col" className="pencil-mono px-3 py-2.5 text-right text-[0.68rem] uppercase tracking-[0.1em] text-[var(--slate)]">
                      Units
                    </th>
                    <th scope="col" className="pencil-mono px-5 py-2.5 text-right text-[0.68rem] uppercase tracking-[0.1em] text-[var(--slate)]">
                      Margin
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {digestRows.map((row) => (
                    <tr
                      key={row.address}
                      style={{ borderBottom: "1px solid var(--hairline)" }}
                      className="last:border-0"
                    >
                      <td className="pencil-mono px-5 py-3 text-[0.84rem] text-[var(--ink)]">
                        {row.address}
                      </td>
                      <td className="pencil-mono px-3 py-3 text-[0.84rem] text-[var(--slate)]">
                        {row.unlock}
                      </td>
                      <td className="pencil-mono px-3 py-3 text-right text-[0.84rem] text-[var(--ink)]">
                        {row.units}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className="pencil-mono inline-flex items-center justify-end gap-1.5 text-[0.84rem] font-medium"
                          style={{ color: "var(--green)" }}
                        >
                          {row.margin}
                          <Check className="size-3.5" strokeWidth={2.5} aria-label="pencils" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
