"use client";

import { setBuildStatus, submitBid } from "@/app/portal/actions";
import { BUILD_LABELS, BUILD_STATUSES, usd, type Bid, type Project } from "@/lib/portal/types";
import { ActionForm, field, label } from "./ActionForm";

/** What a partner builder can do on a referred project: bid, and once chosen, move the build tracker. */
export default function GcPanel({ project, myBid, gcId }: { project: Project; myBid: Bid | null; gcId: string }) {
  const selected = project.selected_gc_id === gcId;
  const lost = !!project.selected_gc_id && !selected;
  return (
    <div className="flex flex-col gap-5">
      <section className="pa-raised p-5" aria-labelledby="bid-h">
        <h3 id="bid-h" className="pa-display text-lg" style={{ color: "var(--ink)" }}>{myBid ? "Your bid" : "Submit your bid"}</h3>
        {myBid && (
          <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>
            {usd(myBid.amount_cents)} over {myBid.timeline_weeks} weeks · {selected ? "selected by the client" : lost ? "the client chose another builder" : "waiting on the client"}
          </p>
        )}
        {!project.selected_gc_id && (
          <ActionForm action={(fd) => submitBid(project.id, fd)} submitLabel={myBid ? "Update bid" : "Send bid"} className="mt-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className={label} style={{ color: "var(--ink)" }}>
                Total price (USD)
                <input name="amount" className={field} inputMode="numeric" defaultValue={myBid ? Math.round(myBid.amount_cents / 100) : ""} placeholder="285000" required />
              </label>
              <label className={label} style={{ color: "var(--ink)" }}>
                Build time (weeks)
                <input name="weeks" className={field} inputMode="numeric" defaultValue={myBid?.timeline_weeks ?? ""} placeholder="26" required />
              </label>
            </div>
            <label className={label} style={{ color: "var(--ink)" }}>
              Notes for the client
              <textarea name="notes" className={field} rows={3} style={{ padding: "0.75rem 1.1rem" }} defaultValue={myBid?.notes ?? ""} placeholder="What is included, allowances, start date…" />
            </label>
          </ActionForm>
        )}
      </section>
      {selected && (
        <section className="pa-raised p-5" aria-labelledby="bs-h">
          <h3 id="bs-h" className="pa-display text-lg" style={{ color: "var(--ink)" }}>Update the build status</h3>
          <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>The client gets an email with every move.</p>
          <ActionForm action={async (fd) => setBuildStatus(project.id, String(fd.get("status")))} submitLabel="Save status" className="mt-3 flex flex-col gap-3">
            <select name="status" className={field} defaultValue={project.build_status ?? "contract_signed"}>
              {BUILD_STATUSES.map((s) => <option key={s} value={s}>{BUILD_LABELS[s]}</option>)}
            </select>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
