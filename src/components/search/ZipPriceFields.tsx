"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { MAX_ZIPS, PRICE_STEPS, SEATTLE_ZIPS, parseZips, priceLabel } from "@/lib/search-filters";

/**
 * Up to five Seattle ZIP codes as removable chips. Type a ZIP and press Enter, a comma or a space (or pick one
 * from the list); paste several at once. Anything outside Seattle is refused with a message.
 */
export function ZipChips({ zips, onChange, size = "md", placeholder = "Add a ZIP" }: { zips: string[]; onChange: (z: string[]) => void; size?: "md" | "lg"; placeholder?: string }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const id = useId();
  const full = zips.length >= MAX_ZIPS;

  function commit(raw: string) {
    if (!raw.trim()) return;
    const r = parseZips(raw, zips);
    onChange(r.zips);
    setText("");
    setMsg(r.rejected.length ? `${r.rejected.join(", ")} ${r.rejected.length === 1 ? "is not" : "are not"} a Seattle ZIP. Seattle only for now.` : r.overLimit ? `Up to ${MAX_ZIPS} ZIP codes.` : null);
  }

  const h = size === "lg" ? 52 : 40;
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-xl px-2" style={{ minHeight: h, background: "var(--card, #fff)", boxShadow: "inset 0 0 0 1px var(--line-strong)" }} onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus()}>
        {zips.map((z) => (
          <span key={z} className="inline-flex items-center gap-1 rounded-lg py-1 pl-2 pr-1 text-sm font-semibold tabular-nums" style={{ background: "var(--green-tint, #E6F2EB)", color: "var(--green, #1F7A55)" }}>
            {z}
            <button type="button" aria-label={`Remove ${z}`} className="flex h-5 w-5 items-center justify-center rounded" onClick={() => onChange(zips.filter((x) => x !== z))}>
              <X size={12} aria-hidden />
            </button>
          </span>
        ))}
        {!full && (
          <>
            <label htmlFor={id} className="sr-only">Seattle ZIP codes, up to {MAX_ZIPS}</label>
            <input
              id={id}
              list={`${id}-list`}
              value={text}
              inputMode="numeric"
              autoComplete="off"
              placeholder={zips.length ? "Add another" : placeholder}
              className="min-w-[90px] flex-1 bg-transparent px-1 text-[16px] outline-none sm:text-sm"
              style={{ boxShadow: "none", minHeight: h - 8 }}
              onChange={(e) => {
                const v = e.target.value;
                // A full ZIP followed by a separator, or a 5-digit pick from the list, commits at once.
                if (/[\s,;]$/.test(v) || (/^\d{5}$/.test(v.trim()) && (SEATTLE_ZIPS as readonly string[]).includes(v.trim()))) commit(v);
                else setText(v);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit(text);
                } else if (e.key === "Backspace" && !text && zips.length) onChange(zips.slice(0, -1));
              }}
              onBlur={() => commit(text)}
              onPaste={(e) => {
                e.preventDefault();
                commit(e.clipboardData.getData("text"));
              }}
            />
            <datalist id={`${id}-list`}>{SEATTLE_ZIPS.filter((z) => !zips.includes(z)).map((z) => <option key={z} value={z} />)}</datalist>
          </>
        )}
        {full && <span className="px-1 text-xs" style={{ color: "var(--slate)" }}>{MAX_ZIPS} max</span>}
      </div>
      {msg && <p role="status" className="mt-1 text-xs" style={{ color: "var(--red, #A9473A)" }}>{msg}</p>}
    </div>
  );
}

/** Min and max price as two pickers. 0 means no limit; the max list only offers values above the min. */
export function PriceRange({ min, max, onChange, size = "md" }: { min: number; max: number; onChange: (r: { min: number; max: number }) => void; size?: "md" | "lg" }) {
  const id = useId();
  const h = size === "lg" ? 52 : 40;
  const sel = "w-full rounded-xl bg-transparent px-3 text-[16px] font-semibold outline-none sm:text-sm";
  const box = { minHeight: h, background: "var(--card, #fff)", boxShadow: "inset 0 0 0 1px var(--line-strong)", color: "var(--ink)" };
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label htmlFor={`${id}-min`} className="sr-only">Minimum price</label>
        <select id={`${id}-min`} className={sel} style={box} value={min} onChange={(e) => {
          const m = Number(e.target.value);
          onChange({ min: m, max: max && m && max < m ? 0 : max });
        }}>
          <option value={0}>No min</option>
          {PRICE_STEPS.filter((p) => p > 0).map((p) => <option key={p} value={p}>{priceLabel(p)}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-max`} className="sr-only">Maximum price</label>
        <select id={`${id}-max`} className={sel} style={box} value={max} onChange={(e) => onChange({ min, max: Number(e.target.value) })}>
          <option value={0}>No max</option>
          {PRICE_STEPS.filter((p) => p > 0 && (!min || p >= min)).map((p) => <option key={p} value={p}>{priceLabel(p)}</option>)}
        </select>
      </div>
    </div>
  );
}
