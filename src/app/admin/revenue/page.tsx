import type { Metadata } from "next";
import PortalFrame from "@/components/portal/PortalFrame";
import { requireViewer, userClient } from "@/lib/portal/server";
import { listPurchases } from "@/lib/server/purchases";
import { PRODUCT_LABELS, revenueTotals } from "@/lib/portal/revenue";
import { usd } from "@/lib/portal/types";

export const metadata: Metadata = { title: "Revenue — Pencil admin" };
export const dynamic = "force-dynamic";

function Tile({ k, v, note }: { k: string; v: string; note?: string }) {
  return (
    <div className="pa-raised min-w-0 p-4">
      <p className="pa-display truncate text-2xl tabular-nums" style={{ color: "var(--ink)" }}>{v}</p>
      <p className="text-xs" style={{ color: "var(--slate)" }}>{k}{note ? ` · ${note}` : ""}</p>
    </div>
  );
}

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Total revenue and every purchase, from the purchases ledger (migration 0011). */
export default async function RevenuePage() {
  const viewer = await requireViewer("/admin/revenue", ["admin"]);
  const db = await userClient();
  const { rows, error } = await listPurchases(db);
  const t = revenueTotals(rows);
  const max = Math.max(1, ...t.byMonth.map((m) => m.amountCents));
  return (
    <PortalFrame viewer={viewer} active="/admin/revenue" wide>
      <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>Revenue</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>Every payment, as it happened. Refunds count against the total.</p>

      {error && (
        <p className="pa-raised mt-4 p-4 text-sm" style={{ color: "var(--red)" }}>
          The purchases table could not be read ({error}). Apply <code>supabase/migrations/0011_purchases.sql</code> to this project.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile k="Total revenue" v={usd(t.allTime)} note={`${t.count} purchase${t.count === 1 ? "" : "s"}`} />
        <Tile k="This month" v={usd(t.thisMonth)} />
        <Tile k="Last 30 days" v={usd(t.last30Days)} />
        <Tile k="Last 7 days" v={usd(t.last7Days)} />
      </div>

      {t.byProduct.length > 0 && (
        <>
          <h2 className="pa-eyebrow mt-6" style={{ color: "var(--green)" }}>By product</h2>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            {t.byProduct.map((p) => <Tile key={p.product} k={PRODUCT_LABELS[p.product] ?? p.product} v={usd(p.amountCents)} note={`${p.count} sold`} />)}
          </div>
        </>
      )}

      {t.byMonth.length > 0 && (
        <>
          <h2 className="pa-eyebrow mt-6" style={{ color: "var(--green)" }}>By month</h2>
          <ol className="pa-raised mt-2 flex items-end gap-2 overflow-x-auto p-4" aria-label="Revenue by month">
            {t.byMonth.map((m) => (
              <li key={m.month} className="flex min-w-[56px] flex-col items-center gap-1 text-[11px]" style={{ color: "var(--slate)" }}>
                <span className="tabular-nums" style={{ color: "var(--ink)" }}>{usd(m.amountCents)}</span>
                <span className="w-8 rounded-t" style={{ height: `${Math.max(4, Math.round((m.amountCents / max) * 80))}px`, background: "var(--green)" }} aria-hidden />
                <span>{m.month}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      <h2 className="pa-eyebrow mt-6" style={{ color: "var(--green)" }}>Purchases</h2>
      {rows.length === 0 ? (
        <p className="pa-raised mt-2 p-5 text-sm" style={{ color: "var(--slate)" }}>No purchases recorded yet.</p>
      ) : (
        <div className="pa-raised mt-2 overflow-x-auto">
          <table className="w-full text-sm" style={{ color: "var(--ink)" }}>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--slate)" }}>
                <th className="px-3 py-2">When</th><th className="px-3 py-2">Product</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Buyer</th><th className="px-3 py-2">Address</th><th className="px-3 py-2">Provider</th><th className="px-3 py-2">Payment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{when(r.created_at)}</td>
                  <td className="px-3 py-2">{PRODUCT_LABELS[r.product] ?? r.product}{r.kind === "refund" ? " (refund)" : ""}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums" style={{ color: r.amount_cents < 0 ? "var(--red)" : "var(--ink)" }}>{r.amount_cents < 0 ? "−" : ""}{usd(Math.abs(r.amount_cents))}</td>
                  <td className="px-3 py-2">{r.email ?? "—"}</td>
                  <td className="max-w-[240px] truncate px-3 py-2">{typeof r.meta?.address === "string" ? r.meta.address : "—"}</td>
                  <td className="px-3 py-2">{r.payment_provider ?? "—"}</td>
                  <td className="max-w-[160px] truncate px-3 py-2 text-xs" style={{ color: "var(--slate)" }}>{r.payment_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalFrame>
  );
}
