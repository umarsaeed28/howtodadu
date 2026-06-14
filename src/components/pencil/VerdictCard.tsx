"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { sampleParcels, type SampleParcel } from "@/lib/sampleParcels";
import { useCountUp } from "./useCountUp";

const CYCLE_MS = 4500;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="pencil-mono text-[0.72rem] uppercase tracking-[0.1em] text-[var(--slate)]">
        {label}
      </span>
      <span className="pencil-mono text-[0.95rem] font-medium text-[var(--ink)] text-right">
        {value}
      </span>
    </div>
  );
}

function VerdictBadge({ parcel }: { parcel: SampleParcel }) {
  const pencils = parcel.verdict === "PENCILS";
  const margin = useCountUp(parcel.margin);

  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div className="pencil-mono text-[0.72rem] uppercase tracking-[0.1em] text-[var(--slate)]">
          Margin
        </div>
        <div
          className="pencil-mono text-[2rem] font-medium leading-none mt-1"
          style={{ color: pencils ? "var(--green-bright)" : "var(--blue)" }}
        >
          +{margin.toFixed(1)}%
        </div>
      </div>
      <span
        className="pencil-mono inline-flex items-center gap-1.5 rounded-[4px] border px-3 py-1.5 text-[0.8rem] font-medium uppercase tracking-[0.08em]"
        style={
          pencils
            ? {
                color: "#fff",
                backgroundColor: "var(--green)",
                borderColor: "var(--green)",
              }
            : {
                color: "var(--blue)",
                backgroundColor: "var(--blue-tint)",
                borderColor: "var(--blue)",
              }
        }
      >
        {parcel.verdict}
        {pencils ? <Check className="size-3.5" strokeWidth={2.5} aria-hidden /> : null}
      </span>
    </div>
  );
}

export function VerdictCard({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const parcel = sampleParcels[index];

  const go = useCallback((next: number) => {
    setIndex(((next % sampleParcels.length) + sampleParcels.length) % sampleParcels.length);
  }, []);

  useEffect(() => {
    if (reduce || paused) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % sampleParcels.length);
    }, CYCLE_MS);
    return () => clearInterval(t);
  }, [reduce, paused]);

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : 0.45 }}
    >
      <div
        className="pencil-card relative w-full max-w-[460px] p-6 sm:p-7"
        role="group"
        aria-roledescription="carousel"
        aria-label="Sample parcel feasibility readouts"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="pencil-mono text-[0.72rem] uppercase tracking-[0.12em] text-[var(--blue)]">
            Parcel · pulled live
          </span>
          <span className="pencil-mono inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-[var(--slate)]">
            <span
              className="pencil-live-dot inline-block size-2 rounded-full"
              style={{ backgroundColor: "var(--green-bright)" }}
              aria-hidden
            />
            Live
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={parcel.id}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <h3 className="pencil-mono mt-2 text-[1.05rem] font-medium leading-snug text-[var(--ink)]">
              {parcel.address}
            </h3>

            <hr className="my-4 border-0 border-t" style={{ borderColor: "var(--hairline)" }} />

            <div className="pencil-mono text-[0.72rem] uppercase tracking-[0.1em] text-[var(--slate)]">
              Zoning unlock
            </div>
            <p className="pencil-mono mt-1.5 text-[0.95rem] text-[var(--ink)]">
              {parcel.zoning}{" "}
              <span aria-hidden className="text-[var(--slate)]">
                →
              </span>{" "}
              <span style={{ color: "var(--green)" }} className="font-medium">
                {parcel.unitYield}
              </span>{" "}
              <span className="text-[var(--slate)]">({parcel.unlockContext})</span>
            </p>

            <div className="mt-5 space-y-2.5">
              <Row label="Best use" value={parcel.bestUse} />
              <Row label="All-in cost" value={parcel.allInCost} />
              <Row label="Projected value" value={parcel.projectedValue} />
            </div>

            <hr className="my-4 border-0 border-t" style={{ borderColor: "var(--hairline)" }} />

            <VerdictBadge parcel={parcel} />

            <span className="sr-only" aria-live="polite">
              {parcel.address}: {parcel.zoning} unlocks {parcel.unitYield}. Margin plus{" "}
              {parcel.margin.toFixed(1)} percent. Verdict: {parcel.verdict}.
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Manual controls */}
        <div className="mt-6 flex items-center gap-2" role="group" aria-label="Choose sample parcel">
          {sampleParcels.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show ${p.address}`}
              aria-pressed={i === index}
              className="size-2.5 rounded-full border transition-colors"
              style={{
                backgroundColor: i === index ? "var(--green)" : "transparent",
                borderColor: i === index ? "var(--green)" : "var(--hairline)",
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
