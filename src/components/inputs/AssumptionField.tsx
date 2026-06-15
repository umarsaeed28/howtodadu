"use client";

import { useId } from "react";

type FieldKind = "currency" | "percent" | "toggle" | "number";

interface AssumptionFieldProps {
  kind: FieldKind;
  label: string;
  value: number | boolean;
  onChange: (value: number | boolean) => void;
  /** True when the user has changed this field from its default. */
  edited?: boolean;
  /** Muted mono note: the default, or the resulting dollar value for a percent. */
  note?: string;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * One labeled assumption row. currency and percent render numeric inputs in
 * IBM Plex Mono; toggle renders a switch. A small dot marks edited fields.
 */
export default function AssumptionField({
  kind,
  label,
  value,
  onChange,
  edited,
  note,
  min,
  max,
  step,
}: AssumptionFieldProps) {
  const id = useId();

  function clamp(n: number): number {
    let v = n;
    if (min != null) v = Math.max(v, min);
    if (max != null) v = Math.min(v, max);
    return v;
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: edited ? "var(--green)" : "transparent" }}
        />
        {label}
        {edited && <span className="sr-only"> (edited)</span>}
      </label>

      <div className="flex items-center gap-2">
        {note && (
          <span className="pa-mono text-xs" style={{ color: "var(--slate)" }}>
            {note}
          </span>
        )}

        {kind === "toggle" ? (
          <button
            id={id}
            type="button"
            role="switch"
            aria-checked={value === true}
            onClick={() => onChange(!(value as boolean))}
            className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
            style={{ background: value ? "var(--green)" : "var(--hairline)" }}
          >
            <span
              className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
              style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }}
            />
          </button>
        ) : (
          <div
            className="flex items-center rounded-[6px] border px-2"
            style={{ borderColor: "var(--hairline)", background: "var(--paper)", minHeight: 44 }}
          >
            {kind === "currency" && (
              <span className="pa-mono text-sm" style={{ color: "var(--slate)" }}>
                $
              </span>
            )}
            <input
              id={id}
              type="number"
              inputMode="decimal"
              value={Number.isFinite(value as number) ? (value as number) : 0}
              min={min}
              max={max}
              step={step ?? (kind === "percent" ? 0.1 : kind === "number" ? 1 : 1000)}
              onChange={(e) => {
                const raw = e.target.value === "" ? 0 : Number(e.target.value);
                onChange(clamp(Number.isFinite(raw) ? raw : 0));
              }}
              className="pa-mono w-28 bg-transparent px-1 py-2 text-right text-sm outline-none"
              style={{ color: "var(--ink)" }}
            />
            {kind === "percent" && (
              <span className="pa-mono text-sm" style={{ color: "var(--slate)" }}>
                %
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
