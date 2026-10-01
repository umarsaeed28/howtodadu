"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import type { Assessment } from "@/lib/ai/types";

type Result = Assessment & { error?: string };

const VERDICT: Record<Assessment["verdict"], { label: string; color: string }> = {
  candidate: { label: "Looks like a candidate", color: "#145A40" },
  not_candidate: { label: "Not a candidate", color: "var(--red)" },
  excluded: { label: "Not a candidate", color: "var(--red)" },
  unverified: { label: "Needs confirming", color: "var(--amber)" },
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
  return (
    <section className="pa-raised p-5" aria-labelledby="ai-h" aria-live="polite">
      <h2 id="ai-h" className="pa-display flex items-center gap-2 text-lg" style={{ color: "var(--ink)" }}>
        <Sparkles size={16} aria-hidden /> DADU read
      </h2>
      {!r ? (
        <p className="mt-3 flex items-center gap-2 text-sm" style={{ color: "var(--slate)" }} role="status">
          <Loader2 size={14} className="animate-spin" aria-hidden /> Checking the knowledge base…
        </p>
      ) : r.error ? (
        <p role="alert" className="mt-3 text-sm" style={{ color: "var(--red)" }}>{r.error}</p>
      ) : (
        <>
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold" style={{ color: v!.color }}>
            {r.verdict === "excluded" || r.verdict === "not_candidate" ? <ShieldAlert size={15} aria-hidden /> : <CircleAlert size={15} aria-hidden />}
            {v!.label}
          </p>
          <p className="mt-1 text-base" style={{ color: "var(--ink)" }}>{r.headline}</p>

          {r.findings.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2.5 text-sm" style={{ color: "var(--ink)" }}>
              {r.findings.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>
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
            <div className="mt-4">
              <p className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Confirm before you rely on this</p>
              <ul className="mt-1 list-disc pl-5 text-sm" style={{ color: "var(--slate)" }}>{r.confirm.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}

          {r.unavailable.length > 0 && (
            <p className="mt-3 text-xs" style={{ color: "var(--slate)" }}>Data unavailable in retrieved sources: {r.unavailable.length} statement{r.unavailable.length === 1 ? "" : "s"} removed because no source supported {r.unavailable.length === 1 ? "it" : "them"}.</p>
          )}

          {r.citations.length > 0 && (
            <ol className="mt-4 flex flex-col gap-0.5 text-xs" style={{ color: "var(--slate)" }}>
              {r.citations.map((c) => (
                <li key={c.label}><strong>{c.label}</strong> {c.docId}{c.section ? `, ${c.section}` : ""}</li>
              ))}
            </ol>
          )}

          <details className="mt-4 text-xs" style={{ color: "var(--slate)" }}>
            <summary className="cursor-pointer font-semibold">How this was checked</summary>
            <ul className="mt-2 flex flex-col gap-1">
              {r.trace.map((t) => (
                <li key={t.node} className="flex gap-2 tabular-nums">
                  <span aria-hidden>{t.ok ? "✓" : "!"}</span>
                  <span><strong>{t.node}</strong> ({t.kind}, {t.ms} ms): {t.note}</span>
                </li>
              ))}
            </ul>
            {r.models.length > 0 && <p className="mt-2">Models: {r.models.join(", ")}{r.cached ? ". Saved result from the last 12 hours." : "."}</p>}
          </details>
        </>
      )}
    </section>
  );
}
