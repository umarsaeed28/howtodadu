"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

const STEPS = ["Reading your lot...", "Checking Seattle code...", "Mapping your buildable space..."];
/** The engine takes 5 to 20 seconds; each line holds about a third of a typical run, and the last waits for the end. */
const STEP_MS = 2600;

/** What the engine is doing while a lot is checked, one line at a time, announced politely to screen readers. */
export default function LoadingSteps({ compact = false }: { compact?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, STEPS.length - 1)), STEP_MS);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={compact ? "lds lds--compact" : "lds"} role="status" aria-live="polite">
      <ol className="lds-list">
        {STEPS.map((s, j) => (
          <li key={s} data-state={j < i ? "done" : j === i ? "now" : "next"}>
            <span className="lds-mark" aria-hidden>{j < i ? <Check size={14} strokeWidth={3} /> : j === i ? <Loader2 size={14} className="animate-spin" /> : null}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <span className="sr-only">{STEPS[i]}</span>
    </div>
  );
}
