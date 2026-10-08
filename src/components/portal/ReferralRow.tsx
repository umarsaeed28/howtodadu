"use client";

import { updateReferral } from "@/app/portal/actions";
import { referralFeeCents, usd, type Referral } from "@/lib/portal/types";
import { ActionForm, field, label } from "./ActionForm";

const STATUS: Record<Referral["status"], string> = { referred: "Referred", bid: "Bid in", won: "Won", lost: "Lost", paid: "Fee paid" };

/** One referral the admin can edit in place: contract value, fee, status. */
export default function ReferralRow({ r, gc, address }: { r: Referral; gc: string; address: string }) {
  const fee = referralFeeCents(r);
  return (
    <li className="pa-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold" style={{ color: "var(--ink)" }}>{address} → {gc}</p>
          <p className="text-xs" style={{ color: "var(--slate)" }}>
            {STATUS[r.status]}{r.contract_value_cents != null ? ` · contract ${usd(r.contract_value_cents)}` : ""}{fee != null ? ` · fee ${usd(fee)}` : ""}{r.paid_at ? ` · paid ${new Date(r.paid_at).toLocaleDateString()}` : ""}
          </p>
        </div>
      </div>
      <ActionForm action={(fd) => updateReferral(r.id, fd)} submitLabel="Save" primary={false} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:items-end">
        <label className={label} style={{ color: "var(--ink)" }}>
          Contract (USD)
          <input name="contract_value" className={field} inputMode="numeric" defaultValue={r.contract_value_cents != null ? Math.round(r.contract_value_cents / 100) : ""} />
        </label>
        <label className={label} style={{ color: "var(--ink)" }}>
          Fee type
          <select name="fee_type" className={field} defaultValue={r.fee_type}><option value="percent">Percent</option><option value="flat">Flat $</option></select>
        </label>
        <label className={label} style={{ color: "var(--ink)" }}>
          Fee
          <input name="fee_value" className={field} inputMode="decimal" defaultValue={String(r.fee_value)} />
        </label>
        <label className={label} style={{ color: "var(--ink)" }}>
          Status
          <select name="status" className={field} defaultValue={r.status}>
            {(Object.keys(STATUS) as Referral["status"][]).map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}
          </select>
        </label>
        <label className={`${label} col-span-2 sm:col-span-1`} style={{ color: "var(--ink)" }}>
          Agreement
          <input name="agreement_note" className={field} defaultValue={r.agreement_note} placeholder="Signed date, terms" />
        </label>
      </ActionForm>
    </li>
  );
}
