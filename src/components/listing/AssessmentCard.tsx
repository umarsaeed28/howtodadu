"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert, CircleCheck, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import type { Assessment } from "@/lib/ai/types";

type Result = Assessment & { error?: string };

const VERDICT: Record<Assessment["verdict"], { label: string; color: string; bg: string }> = {
  candidate: { label: "Looks like a candidate", color: "#145A40", bg: "var(--green-tint)" },
  not_candidate: { label: "Not a candidate", color: "var(--red)", bg: "var(--red-tint)" },
  excluded: { label: "Not a candidate", color: "var(--red)", bg: "var(--red-tint)" },
  unverified: { label: "Needs confirming", color: "var(--amber)", bg: "var(--amber-tint)" },
};

/** The checked DADU read: Claude's findings, each tied to a knowledge-base passage or a city/listing fact. */
export default function AssessmentCard({ mlsId }: { mlsId: string }) {
  const [r, setR] = useState<Result | null>(null);
  useEffect(() => {
    const ctl = new AbortController();
    fetch(`/api/assessment?id=${encodeURIComponent(mlsId)}`, { signal: ctl.signal })
      .then(async (res) => setR((await res.json()) as Result))
      .catch(() => {});
    return () => ctl.abort();
  }, [mlsId]);

  const v = r && !r.error ? VERDICT[r.verdict] : null;
  const sc = r && !r.error ? r.score : null;
  return (
    <section className="pa-raised p-5" aria-labelledby="ai-h" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ai-h" className="pa-display flex scroll-mt-[130px] items-center gap-2 text-lg" style={{ color: "var(--ink)" }}>
          <Sparkles size={16} aria-hidden /> AI review
        </h2>
        {v && (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: v.bg, color: v.color }}>
            {r!.verdict === "excluded" || r!.verdict === "not_candidate" ? <ShieldAlert size={13} aria-hidden /> : r!.verdict === "candidate" ? <CircleCheck size={13} aria-hidden /> : <CircleAlert size={13} aria-hidden />}
            {v.label}
          </span>
        )}
      </div>
      {!r ? (
        <div className="mt-4 flex flex-col gap-2" role="status">
          <span className="sr-only">Reading the rules for this lot</span>
          {[90, 75, 82].map((w) => <div key={w} className="h-3 animate-pulse rounded-full motion-reduce:animate-none" style={{ width: `${w}%`, background: "var(--green-tint)" }} />)}
          <p className="mt-1 flex items-center gap-2 text-xs" style={{ color: "var(--slate)" }}><Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden /> Reading the Seattle rules for this lot. About 10 seconds.</p>
        </div>
      ) : r.error ? (
        <p role="alert" className="mt-3 text-sm" style={{ color: "var(--red)" }}>{r.error}</p>
      ) : (
        <>
          <p className="mt-3 text-base font-semibold leading-snug" style={{ color: "var(--ink)" }}>{r.headline}</p>

          {r.findings.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2 text-sm" style={{ color: "var(--ink)" }}>
              {r.findings.map((f, i) => (
                <li key={i} className="flex gap-2.5">
                  <Check size={15} className="mt-0.5 shrink-0" aria-hidden style={{ color: "var(--green)" }} />
                  <span className="leading-relaxed">
                    {f.claim}{" "}
                    {f.cites.map((c) => (
                      <sup key={c} className="ml-0.5 rounded px-1 text-[10px] font-semibold" style={{ background: "var(--green-tint)", color: "#145A40" }}>{c}</sup>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {r.confirm.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1.5 text-sm">
              {r.confirm.map((c, i) => (
                <li key={i} className="flex gap-2.5 rounded-lg px-3 py-2" style={{ background: "var(--amber-tint)", color: "var(--ink)" }}>
                  <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden style={{ color: "var(--amber)" }} /><span><span className="sr-only">Confirm: </span>{c}</span>
                </li>
              ))}
            </ul>
          )}

          {sc && (
            <p className="mt-4 text-sm tabular-nums" style={{ color: "var(--slate)" }}>
              Score: rules {sc.baselineScore}, {sc.decidedBy === "ai" ? (sc.score === sc.baselineScore ? "the review kept it" : `the review moved it to ${sc.score} (${sc.grade})`) : "rules only"}.
            </p>
          )}

          <details className="pa-more mt-3 text-xs" style={{ color: "var(--slate)" }}>
            <summary className="cursor-pointer font-semibold" style={{ color: "var(--green)" }}>Sources and how this was checked</summary>
            {r.unavailable.length > 0 && (
              <p className="mt-2">{r.unavailable.length} statement{r.unavailable.length === 1 ? "" : "s"} removed because no source supported {r.unavailable.length === 1 ? "it" : "them"}.</p>
            )}
            {r.citations.length > 0 && (
              <ol className="mt-2 flex flex-col gap-0.5">
                {r.citations.map((c) => (
                  <li key={c.label}><strong>{c.label}</strong> {c.docId}{c.section ? `, ${c.section}` : ""}</li>
                ))}
              </ol>
            )}
            <ul className="mt-3 flex flex-col gap-1">
              {r.trace.map((t) => (
                <li key={t.node} className="flex gap-2 tabular-nums">
                  <span aria-hidden>{t.ok ? "✓" : "!"}</span>
                  <span><strong>{t.node}</strong> ({t.kind}, {t.ms} ms): {t.note}</span>
                </li>
              ))}
            </ul>
            {r.models.length > 0 && <p className="mt-2">Models: {r.models.join(", ")}{r.cached ? ". Saved result." : "."}</p>}
          </details>
        </>
      )}
    </section>
  );
}
