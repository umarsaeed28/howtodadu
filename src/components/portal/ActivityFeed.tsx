import type { Activity } from "@/lib/portal/types";

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** The project's log, newest first. */
export default function ActivityFeed({ items }: { items: Activity[] }) {
  if (!items.length) return null;
  return (
    <section className="pa-raised p-5" aria-labelledby="act-h">
      <h3 id="act-h" className="pa-display text-lg" style={{ color: "var(--ink)" }}>Updates</h3>
      <ol className="mt-3 flex flex-col gap-2.5">
        {items.map((a) => (
          <li key={a.id} className="flex gap-3 text-sm">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: a.kind === "stage_change" || a.kind === "payment" ? "var(--green)" : "var(--line-strong)" }} aria-hidden />
            <div className="min-w-0 flex-1">
              <p style={{ color: "var(--ink)" }}>{a.message}</p>
              <p className="text-[11px]" style={{ color: "var(--slate)" }}>{when(a.created_at)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
