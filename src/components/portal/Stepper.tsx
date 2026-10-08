import { Check } from "lucide-react";
import { STAGES, STAGE_LABELS, stageIndex, type Stage } from "@/lib/portal/types";

/** The four stages, fixed at the top of a project. One is active; the ones before it are done. */
export default function Stepper({ stage }: { stage: Stage }) {
  const cur = stageIndex(stage);
  return (
    <ol className="sticky top-[var(--nav-h,64px)] z-20 -mx-4 flex border-b px-4 py-3 md:-mx-6 md:px-6" style={{ background: "var(--paper)", borderColor: "var(--hairline)" }} aria-label="Project stages">
      {STAGES.map((s, i) => {
        const state = i < cur ? "done" : i === cur ? "active" : "todo";
        const color = state === "todo" ? "var(--slate)" : state === "done" ? "var(--green)" : "var(--ink)";
        return (
          <li key={s} className="flex min-w-0 flex-1 items-center gap-2" aria-current={state === "active" ? "step" : undefined}>
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums"
              style={state === "done" ? { background: "var(--green)", color: "#fff" } : state === "active" ? { background: "var(--ink)", color: "#fff" } : { boxShadow: "inset 0 0 0 1.5px var(--line-strong)", color: "var(--slate)" }}
              aria-hidden
            >
              {state === "done" ? <Check size={14} strokeWidth={3} /> : i + 1}
            </span>
            <span className="truncate text-xs font-semibold sm:text-sm" style={{ color }}>
              <span className="sr-only">{state === "done" ? "Done: " : state === "active" ? "Current: " : "Next: "}</span>
              {STAGE_LABELS[s]}
            </span>
            {i < STAGES.length - 1 && <span className="mx-1 hidden h-px flex-1 sm:block" style={{ background: i < cur ? "var(--green)" : "var(--line-strong)" }} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

/** A status tracker inside a stage (permit or build): a row of dots with the current one filled. */
export function Tracker<T extends string>({ steps, labels, current, note }: { steps: readonly T[]; labels: Record<T, string>; current: T | null; note?: Partial<Record<T, string>> }) {
  const cur = current ? steps.indexOf(current) : -1;
  return (
    <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < cur;
        const active = i === cur;
        return (
          <li key={s} className="min-w-0 text-center" aria-current={active ? "step" : undefined}>
            <div className="h-1.5 rounded-full" style={{ background: done || active ? "var(--green)" : "var(--green-tint)", opacity: active ? 1 : done ? 0.6 : 1 }} aria-hidden />
            <p className="mt-1.5 truncate text-[11px] font-semibold" style={{ color: active ? "var(--ink)" : done ? "var(--green)" : "var(--slate)" }}>
              {labels[s]}
              {note?.[s] ? <span className="ml-1 font-normal" style={{ color: "var(--slate)" }}>{note[s]}</span> : null}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
