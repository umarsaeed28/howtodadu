"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { NUMBER_FIELDS, type InvestAssumptions } from "@/lib/invest/assumptions";
import { saveInvestSettings } from "@/app/admin/invest/actions";

export default function InvestSettingsForm({ initial }: { initial: InvestAssumptions }) {
  const [state, action, pending] = useActionState(saveInvestSettings, {});
  return (
    <form action={action} className="pa-raised grid gap-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {NUMBER_FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-sm font-semibold" style={{ color: "var(--ink)" }}>
            {f.label} ({f.unit === "$" ? "dollars" : "percent"})
            <input name={f.key} type="number" min={f.min} max={f.max} step={f.step} defaultValue={initial[f.key]} className="pa-input rounded-xl border px-3 py-2 font-normal tabular-nums" required />
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
        <input type="checkbox" name="financeConstruction" defaultChecked={initial.financeConstruction} /> Assume the build is financed with a construction loan
      </label>
      {state.error && <p role="alert" className="text-sm" style={{ color: "var(--red)" }}>{state.error}</p>}
      {state.ok && <p role="status" className="text-sm" style={{ color: "var(--green)" }}>Saved. Today&apos;s feed was rerun with these numbers.</p>}
      <button type="submit" className="pa-btn pa-btn-primary justify-self-start" disabled={pending}>
        {pending && <Loader2 size={15} className="animate-spin" aria-hidden />} Save and rerun
      </button>
    </form>
  );
}
