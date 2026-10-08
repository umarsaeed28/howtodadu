"use client";

import { submitBuildRequest } from "@/app/portal/actions";
import { AREAS, AREA_LABELS, BUDGET_LABELS, BUDGET_TIERS, SIZE_LABELS, SIZE_TIERS, type SizeTier } from "@/lib/portal/types";
import { ActionForm, field, label } from "./ActionForm";

/** Stage 4 opens with four short questions and the referral disclosure the client must acknowledge. */
export default function BuildQuestionnaire({ projectId, defaultSize }: { projectId: string; defaultSize: SizeTier }) {
  return (
    <ActionForm action={(fd) => submitBuildRequest(projectId, fd)} submitLabel="Get build quotes" className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Budget for the build</legend>
        <div className="grid grid-cols-3 gap-2">
          {BUDGET_TIERS.map((t, i) => (
            <label key={t} className="pa-inset flex cursor-pointer items-center justify-center px-2 py-3 text-center text-sm font-semibold has-[:checked]:bg-[var(--green-tint)] has-[:checked]:text-[var(--green)]" style={{ color: "var(--ink)" }}>
              <input type="radio" name="budget_tier" value={t} defaultChecked={i === 1} className="sr-only" /> {BUDGET_LABELS[t]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label} style={{ color: "var(--ink)" }}>
          When do you want to break ground?
          <input name="timeline" className={field} placeholder="This spring, within a year…" />
        </label>
        <label className={label} style={{ color: "var(--ink)" }}>
          Part of town
          <select name="area" className={field} defaultValue="north">
            {AREAS.map((a) => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
          </select>
        </label>
        <label className={label} style={{ color: "var(--ink)" }}>
          Finishes
          <input name="finishes" className={field} placeholder="Standard, upgraded, high end" />
        </label>
        <label className={label} style={{ color: "var(--ink)" }}>
          Financing
          <input name="financing" className={field} placeholder="Cash, HELOC, construction loan, not sure" />
        </label>
        <label className={label} style={{ color: "var(--ink)" }}>
          DADU size
          <select name="size_tier" className={field} defaultValue={defaultSize}>
            {SIZE_TIERS.map((s) => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
          </select>
        </label>
      </div>
      <label className="pa-inset flex items-start gap-3 px-3 py-3 text-sm" style={{ color: "var(--ink)" }}>
        <input type="checkbox" name="disclosure" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--green)]" required />
        <span>
          <strong>Referral disclosure.</strong> Pencil may receive a referral fee from contractors it introduces you to. The fee does not change your price, and you are free to choose any builder. I acknowledge this disclosure.
        </span>
      </label>
    </ActionForm>
  );
}
