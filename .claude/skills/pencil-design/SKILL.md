---
name: pencil-design
description: Pencil's design language (Zillow-clear layout, Pencil green, flat white surfaces). Use when building or restyling any Pencil page or component, so new UI matches the map, report and listing pages.
---

# Pencil design language

Read `design-model.yaml` first; it is the source of truth. The tokens live as CSS variables in
`src/app/pencil-ui.css` (`.pencil-app`) and `src/app/site.css` (`.site`). Use the variables, not raw hex.

Patterns already built, reuse them:
- Map + results split with a sideways-scrolling filter bar: `src/components/map/CandidateMap.tsx` (`ListingCard`).
- Detail header with the big number, facts line and sticky section tabs: `src/components/report/FeasibilityReportView.tsx`
  (`Hero`, `SectionTabs`) and `src/app/listing/[mlsId]/page.tsx`.
- Buttons `.pa-btn` / `.pa-btn-primary`, pills `.pa-chip` / `.pa-chip-active`, cards `.pa-raised`, wells `.pa-inset`.

Checklist for new UI: numbers in Archivo 800 with tabular numerals; one card elevation; 12px controls and 16px cards;
green only for actions and DADU facts; test at 375, 768, 1024 and 1440 px with no sideways page scroll.
