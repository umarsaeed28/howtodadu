---
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

## ADUs per lot
Value: 2. Up to two ADUs on a lot with a principal dwelling unit, in any mix of attached, detached or stacked.
Source: Seattle code rule, SMC 23.42.022.

## ADU size cap, 2 bedrooms or fewer
Value: 1,000 sq ft. An ADU with two bedrooms or fewer may have up to 1,000 sq ft of gross floor area.
Source: Seattle code rule, SMC 23.42.022.G.1.a.

## ADU size cap, 3 bedrooms or more
Value: 1,200 sq ft. An ADU with three or more bedrooms may have up to 1,200 sq ft of gross floor area.
Source: Seattle code rule, SMC 23.42.022.G.1.b.

## Attached garage left out of the ADU size cap
Value: 250 sq ft. Up to 250 sq ft of a garage attached to an ADU does not count toward its size cap; the rest of the garage does, and all of it counts toward lot coverage.
Source: Seattle code rule, SMC 23.42.022.

## Long-term bike storage left out of the ADU size cap
Value: 35 sq ft. Up to 35 sq ft of long-term bike storage does not count toward an ADU's size cap.
Source: Seattle code rule, SMC 23.42.022.

## Fully underground stories left out of the ADU size cap
Value: yes. Stories that are fully underground do not count toward an ADU's gross floor area.
Source: Seattle code rule, SMC 23.42.022.G.2.b.

## Off-street parking for an ADU
Value: no. No off-street parking is required for any ADU anywhere in Seattle.
Source: Seattle code rule, SMC 23.42.022.

## ADU sold as a condominium
Value: yes. An individual ADU may be sold as a condominium unit.
Source: Seattle code rule, SMC 23.42.022.

## Code minimum lot size for a DADU
Value: 0 sq ft. Seattle has no minimum lot size for a DADU since Ordinance 127211 repealed SMC 23.44.041 and its 3,200 sq ft, 25 ft by 70 ft table. Pencil's own screen is separate (see Pencil screens).
Source: Seattle code rule, Ordinance 127211 (repealed SMC 23.44.041).

## Lot coverage limit, Neighborhood Residential
Value: 50 percent of the lot. Buildings may cover up to 50 percent of the lot. The old 1,000 sq ft plus 15 percent curve no longer applies.
Source: Seattle code rule, SMC 23.44.080.A.

## Floor area always allowed on a lot under 5,000 sq ft
Value: 2,500 sq ft. A lot under 5,000 sq ft may always have 2,500 sq ft of chargeable floor area, whatever the FAR gives.
Source: Seattle code rule, SMC 23.44.050.B.

## Lot size below which the small-lot floor area applies
Value: 5,000 sq ft. The 2,500 sq ft floor area minimum applies to lots under 5,000 sq ft.
Source: Seattle code rule, SMC 23.44.050.B.

## Height limit, principal unit and ADU
Value: see below. An ADU takes the principal unit's height limit: 32 ft, plus 5 ft for a pitched roof ridge (4:12 or steeper) or 3 ft for a shed or butterfly roof.
Source: Seattle code rule, SMC 23.42.022.E; SMC 23.44.070.

## ADU rear setback
Value: 5 ft. A DADU sits at least 5 ft from the rear lot line, or 0 ft where the rear lot line abuts an alley.
Source: Seattle code rule, SMC 23.44.090 Table A.

## Side setback
Value: see below. Side setbacks average 5 ft with a 3 ft minimum; Pencil uses the 5 ft average.
Source: Seattle code rule, SMC 23.44.090 Table A.

## Front setback, one or two units
Value: 15 ft. 15 ft on a lot with one or two dwelling units (10 ft with three or more). A DADU may not sit in it.
Source: Seattle code rule, SMC 23.44.090 Table A.

## Gap between the house and a DADU
Value: 5 ft. Pencil keeps a DADU at least 5 ft from the house and other buildings; the section is not confirmed.
Source: Seattle code rule, SMC 23.44.100; not yet confirmed against the code text.

## Floor area ratio by lot area per unit
FAR is 0.6 above 4,000 sq ft of lot per unit, 0.8 from 2,201 to 4,000, 1.0 from 1,601 to 2,200 and 1.6 at 1,600 or less. The house and every ADU count as units. Source: Seattle code rule, SMC 23.44.050 Table A.

| Lot area per unit | FAR |
| --- | --- |
| More than 4,000 sq ft | 0.6 |
| 2,201 to 4,000 sq ft | 0.8 |
| 1,601 to 2,200 sq ft | 1 |
| 1,600 sq ft or less | 1.6 |

# Pencil screens and design assumptions

## Smallest lot Pencil shows
Value: 3,800 sq ft. A hard screen: Pencil never shows or recommends a lot under 3,800 sq ft. It is Pencil's investment screen, not a city rule.
Source: Pencil's own rule, not a city rule.

## Lot width below which Pencil warns
Value: 25 ft. A warning, not a rule: lots narrower than 25 ft rarely fit a DADU and a path to it. Carried over from the repealed SMC 23.44.041 table.
Source: Pencil's own rule, not a city rule.

## Lot depth below which Pencil warns
Value: 70 ft. A warning, not a rule: lots shallower than 70 ft rarely leave room behind the house. Carried over from the repealed SMC 23.44.041 table.
Source: Pencil's own rule, not a city rule.

## HOA
Value: 0 $ per month. A property with any HOA fee is never a DADU candidate.
Source: Pencil's own rule, not a city rule.

## Zones Pencil shows
Value: NR, NR2, NR3. Neighborhood Residential lots zoned NR, NR2 or NR3; NR1 is out.
Source: Pencil's own rule, not a city rule.

## Most of the lot already built on
Value: 25 percent. Pencil shows lots with under 25 percent of the lot built on, so a DADU has room.
Source: Pencil's own rule, not a city rule.

## Lowest DADU site score Pencil shows
Value: 65 points. Lots scoring under 65 out of 100 are not shown.
Source: Pencil's own rule, not a city rule.

## Smallest DADU footprint
Value: see below. A DADU needs an open spot of at least 15 by 20 ft (300 sq ft) inside the setbacks, out of the front yard and 5 ft from the house.
Source: Pencil's own rule, not a city rule.

## Driveway width to the rear
Value: 10 ft. Vehicle access to a rear DADU without an alley or corner needs a 10 ft side clearance; under 8 ft is blocked.
Source: Pencil's own rule, not a city rule.

## Floor-to-floor height used for stories
Value: 10 ft. Pencil turns a height limit into stories at 10 ft each: 32 ft allows three.
Source: Pencil's own rule, not a city rule.
