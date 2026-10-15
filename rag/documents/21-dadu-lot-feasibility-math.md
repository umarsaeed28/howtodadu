---
title: DADU lot feasibility math (Seattle NR zones)
citation: SMC 23.42.022; SMC 23.44.050; SMC 23.44.070; SMC 23.44.080
source_url: https://library.municode.com/wa/seattle/codes/municipal_code
publisher: Pencil feasibility engine spec v2.5 and v2.6, checked against Pencil's rules engine
effective_date: 2026-01-21
retrieved_at: 2026-10-15
---

# DADU lot feasibility math (Seattle NR zones)

> How Pencil works out whether a DADU fits on a Seattle lot in a Neighborhood Residential (NR) zone, from the team's
> feasibility engine spec (v2.5 and v2.6) as checked against Pencil's rules engine. Rules for the unit itself (count, size,
> parking, condo sale) are in the SMC 23.42.022 document. Confirm numbers against the code before a permit.

Also called: DADU, ADU, detached accessory dwelling unit, backyard cottage, lot coverage, FAR, floor area ratio, chargeable floor area.

## The inputs a feasibility check needs
What do I need to know about a lot to check a DADU? Seven inputs: the lot area (square feet), the zone (NR1, NR2, NR3
or RSL), the total number of units proposed including the house, the existing building footprint, the existing
above-grade chargeable floor area, the size of any attached garage planned in the DADU, and whether a public alley
abuts the lot.

## Order of the checks
How is a DADU checked against the lot? In this order:
1. Lot coverage: the coverage limit minus the existing footprint gives the footprint left for the DADU.
2. Floor area (FAR): the floor area limit minus the existing chargeable floor area gives the floor area left.
3. ADU size cap: the DADU is the smaller of the floor area left and the SMC 23.42.022 cap (1,000 sq ft with two
   bedrooms or fewer, 1,200 sq ft with three or more), per unit.
4. Exemptions: fully underground stories, up to 250 sq ft of an attached garage and up to 35 sq ft of long-term bike
   storage are not counted against the ADU size cap.

## Attached garage in a DADU
Does a garage count toward the DADU's size limit? Up to 250 sq ft of a garage attached to the DADU is excluded from the
DADU's gross floor area (SMC 23.42.022). Any garage area beyond 250 sq ft counts.
- A two-bedroom DADU with 1,000 sq ft of living space and a 250 sq ft attached garage is a 1,250 sq ft building that
  counts as 1,000 sq ft, so it meets the 1,000 sq ft cap.
- With a 400 sq ft attached garage, 150 sq ft of the garage counts, so the living space can be at most 850 sq ft to
  stay within 1,000 sq ft.
- A three-bedroom DADU (1,200 sq ft cap) with a 250 sq ft attached garage can be a 1,450 sq ft building.
The exemption applies to the ADU size cap only. The garage is still a building on the ground, so its full footprint
counts toward lot coverage. Whether it also counts toward the lot's FAR is not settled in Pencil's sources; count it
until confirmed. Pencil's rules engine does not yet model the garage exemption: its DADU size excludes garages
entirely, so a garage must be added by hand when checking coverage.

## Lot coverage limit
How much of the lot can buildings cover in an NR zone? 50 percent of the lot area (SMC 23.44.080.A, as amended
January 2026). Example: a 4,000 sq ft lot may have 2,000 sq ft of building coverage.
The old single-family rule (1,000 sq ft plus 15 percent of the lot under 5,000 sq ft, 35 percent above) was replaced by
the 50 percent limit and no longer applies in NR zones. Stacked units or courtyard development can reach 60 percent
(SMC 23.44.080.F-G). Riparian corridors, wetlands, shorelines and steep slopes can be left out of the lot area used
for coverage (SMC 23.44.080.B).

## Floor area ratio by density
What FAR does an NR lot get? It depends on lot area per unit, counting the house and every ADU as units
(SMC 23.44.050 Table A):

| Lot area per unit | FAR |
| --- | --- |
| More than 4,000 sq ft | 0.6 |
| 2,201 to 4,000 sq ft | 0.8 |
| 1,601 to 2,200 sq ft | 1.0 |
| 1,600 sq ft or less | 1.6 |

Maximum chargeable floor area = FAR x lot area. A DADU's floor area counts toward it, and so do ADUs in the unit count.

## Small lot floor area minimum
Is there a minimum floor area on a small lot? Yes. A lot under 5,000 sq ft may always have 2,500 sq ft of chargeable
floor area, whatever the FAR table gives (SMC 23.44.050.B).

## Height
How tall can a DADU be in an NR zone? The same as a principal dwelling unit (SMC 23.42.022.E): 32 ft
(SMC 23.44.070.A.1), plus 5 ft for the ridge of a pitched roof of 4:12 or steeper, or 3 ft for the high side of a shed
or butterfly roof (SMC 23.44.070.B). That allows up to three stories.

## Worked example: 4,000 sq ft NR3 lot, two DADUs in one building
A 4,000 sq ft NR3 lot has a house with a 700 sq ft footprint, 1,400 sq ft of above-grade floor area and a 700 sq ft
fully underground basement. The owner adds one detached building with two DADUs (three units in all).
- Lot coverage: 50 percent of 4,000 = 2,000 sq ft. Existing 700. Left: 1,300 sq ft of footprint.
- Floor area: 4,000 / 3 units = 1,333 sq ft per unit, so FAR 1.6 and 6,400 sq ft maximum. Existing 1,400 (the
  underground basement does not count). Left: 5,000 sq ft. The 2,500 sq ft small-lot minimum does not bind.
- ADU caps: two units of 1,000 sq ft (two bedrooms or fewer) = 2,000 sq ft, or 2 x 1,200 = 2,400 sq ft with three
  bedrooms each. The caps bind, not the FAR.
- Fit: two 1,000 sq ft units stacked over two stories need about 1,000 sq ft of footprint, inside the 1,300 left.
- Parking: none required.

## Not used in Pencil's math
Alley width credits toward lot coverage appear in the team spec but are not in Pencil's rules engine or its code
citations; treat them as unverified. The team spec also cites SMC 23.42.022.J for ADUs counting toward the lot's unit
total; Pencil's FAR math counts them, but that subsection reference is unverified. Spec v2.6 cites SMC 23.42.022.C.2.a
for the garage exemption, while Pencil's engine places the ADU floor area rules in subsection G; the subsection is
unverified. The spec also says exempt areas are left out of lot coverage; for an above-ground garage that is not right
(see the garage section).
