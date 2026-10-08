import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { STAGE_LABELS, stageIndex, STAGES, nextAction, type ProjectBundle } from "@/lib/portal/types";

const WHO: Record<ReturnType<typeof nextAction>["who"], { bg: string; fg: string; label: string }> = {
  client: { bg: "var(--amber-tint)", fg: "var(--amber)", label: "Your move" },
  pencil: { bg: "var(--green-tint)", fg: "var(--green)", label: "Pencil" },
  gc: { bg: "var(--green-tint)", fg: "var(--green)", label: "Builder" },
  done: { bg: "var(--green-tint)", fg: "var(--green)", label: "Done" },
};

/** One project on the dashboard: where it is, the one next action, the latest update. */
export default function ProjectCard({ b, href }: { b: Pick<ProjectBundle, "project" | "feasibility" | "permit" | "designs" | "buildRequest" | "bids">; href?: string }) {
  const p = b.project;
  const na = nextAction(b);
  const who = WHO[na.who];
  const idx = stageIndex(p.stage);
  const title = p.address ? p.address.replace(/,\s*Seattle,\s*WA.*$/i, "") : "Finding a lot";
  return (
    <Link href={href ?? `/portal/projects/${p.id}`} className="pa-raised block p-4 no-underline transition-transform hover:-translate-y-0.5 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-lg font-semibold" style={{ color: "var(--ink)" }}>
            <MapPin size={16} aria-hidden style={{ color: "var(--green)" }} /> {title}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--slate)" }}>Stage {idx + 1} of {STAGES.length} · {STAGE_LABELS[p.stage]}</p>
        </div>
        {b.feasibility && (
          <span className="pa-display shrink-0 text-2xl tabular-nums" style={{ color: "var(--ink)" }} aria-label={`Score ${b.feasibility.score}`}>{b.feasibility.score}</span>
        )}
      </div>
      <div className="mt-3 flex gap-1" aria-hidden>
        {STAGES.map((s, i) => (
          <span key={s} className="h-1.5 flex-1 rounded-full" style={{ background: i <= idx ? "var(--green)" : "var(--green-tint)" }} />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: who.bg, color: who.fg }}>{who.label}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>{na.text}</span>
        <ArrowRight size={16} aria-hidden style={{ color: "var(--green)" }} />
      </div>
      {p.latest_update && <p className="mt-2 truncate text-xs" style={{ color: "var(--slate)" }}>Latest: {p.latest_update}</p>}
    </Link>
  );
}
