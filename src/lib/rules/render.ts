import { ADU, NR, NR_FAR_TABLE, PENCIL, type Rule } from "./seattle-adu";

/**
 * The rulebook as a knowledge-base document (rag/documents/22-pencil-rulebook.md), so the AI reads exactly the numbers
 * the engine uses. Written by `npm run kb:rulebook`; rulebook.test.ts fails when the file is out of date.
 */

const fmt = (v: unknown, unit?: string): string => {
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") {
    if (unit === "share of lot") return `${Math.round(v * 100)} percent of the lot`;
    return `${v.toLocaleString("en-US")}${unit ? ` ${unit}` : ""}`;
  }
  if (Array.isArray(v)) return v.join(", ");
  return "see below";
};

function section(r: Rule<unknown>): string {
  const meta = [
    r.kind === "code" ? `Seattle code rule${r.citation ? `, ${r.citation}` : ""}` : "Pencil's own rule, not a city rule",
    r.status === "unverified" ? "not yet confirmed against the code text" : null,
  ].filter(Boolean).join("; ");
  return `## ${r.label}\nValue: ${fmt(r.value, r.unit)}. ${r.summary}\nSource: ${meta}.`;
}

export function renderRulebookDoc(): string {
  const codeRules = [...Object.values(ADU), ...Object.values(NR)] as Rule<unknown>[];
  const pencilRules = Object.values(PENCIL) as Rule<unknown>[];
  const farRows = NR_FAR_TABLE.map((r, i) => {
    const hi = i === 0 ? null : NR_FAR_TABLE[i - 1].lotPerUnitAboveSqft;
    const range = i === 0 ? `More than ${r.lotPerUnitAboveSqft.toLocaleString("en-US")} sq ft`
      : r.lotPerUnitAboveSqft === -Infinity ? `${hi!.toLocaleString("en-US")} sq ft or less`
      : `${(r.lotPerUnitAboveSqft + 1).toLocaleString("en-US")} to ${hi!.toLocaleString("en-US")} sq ft`;
    return `| ${range} | ${r.far} |`;
  });
  return `---
title: Pencil rulebook for Seattle DADUs and ADUs
citation: SMC 23.42.022; SMC 23.44.050; SMC 23.44.070; SMC 23.44.080; SMC 23.44.090
publisher: Pencil (generated from src/lib/rules/seattle-adu.ts)
---

# Pencil rulebook for Seattle DADUs and ADUs

> Every number Pencil's feasibility engine uses, generated from the engine's own rulebook, so it always matches the
> calculations. Seattle code rules carry their code section; Pencil's own screens are marked as Pencil's, never as
> city rules. Do not edit by hand: change src/lib/rules/seattle-adu.ts and run npm run kb:rulebook.

Also called: DADU, ADU, AADU, detached accessory dwelling unit, backyard cottage, rules, limits, screen, buy box.

# Seattle code rules

${codeRules.filter((r) => r !== NR.farTable).map(section).join("\n\n")}

## ${NR.farTable.label}
${NR.farTable.summary} Source: Seattle code rule, ${NR.farTable.citation}.

| Lot area per unit | FAR |
| --- | --- |
${farRows.join("\n")}

# Pencil screens and design assumptions

${pencilRules.map(section).join("\n\n")}
`;
}
