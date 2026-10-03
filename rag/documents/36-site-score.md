# How the DADU Site Score Works

> How the app builds its rules baseline score. The baseline comes from the team guide (documents 31 to 35). For a listing, the AI reviewer may move it up or down by up to 15 points, citing a passage or listing fact for each change.

Also called: DADU score, site score, grade, backyard cottage score.

## Gates
A lot that fails any gate cannot have a DADU and gets no score:
- An HOA with dues above $0 per month.
- A lot under 3,200 sq ft.
- Two ADUs already on the lot.
- Room for a DADU under 300 sq ft.
- No vehicle access to the rear: no alley, not a corner lot, and the house leaves less than 8 ft on both sides at the roofline (measured from the city's building outlines, which include the eaves).
Zoning outside single-family Neighborhood Residential is not covered by the guide, so the result is unverified.

## Factors and weights
- Vehicle access, weight 30. Alley access is best; a corner lot is next. With no alley, the app measures the room the house leaves beside it: 12 ft or more fits a driveway, 10 to 12 ft is tight, 8 to 10 ft must be confirmed on site because the roofline overstates the house, and under 8 ft is excluded. When the room is not measured, it falls back to lot width (45 ft or wider can take a side driveway, 40 to 44 ft is very tight) and the lot cannot be a top pick until someone confirms a driveway fits.
- Layout fit, weight 20. Side by side on lots 50 ft or wider is best; staggered on deep lots at least 45 ft wide is next; single rear DADU on 40 to 49 ft lots; deep narrow lots risk a straight stack.
- DADU size, weight 20. Scales from 300 sq ft up to 1,000 sq ft, the size the engine currently allows.
- Slope and critical areas, weight 20. Steep slope lowers the score, and each critical-area flag (wetland, riparian corridor, landslide, flood-prone, peat, landfill) lowers it further.
  - The ground where the DADU goes is measured too: 25 elevation samples from 1 m lidar across the DADU site behind the house, fitted to a plane. A sloped site needs a stepped foundation, retaining walls and more excavation, so it costs more to build even when the city's steep-slope critical area (40% and up) does not flag it.
  - Under 5%: close to flat, no change. 5 to 10%: a moderate slope, 15 points off this factor. 10% or more: steep, this factor is 40 at most and the lot is Fair at best. 20% or more: very steep, this factor is 10 at most and the lot is Marginal.
- Tree canopy, weight 10. Trees are measured one by one from the city's 2021 LiDAR tree crowns, including a neighbour's crown that hangs over the line. Each tree is sized from its crown and height: large (crown about 30 ft across or more, or 50 ft tall: usually a protected Tier 2 tree under SMC 25.11), medium (about 20 ft across, or 30 ft tall: Tier 3, removal needs review and replacement) or small. Large trees decide where a DADU can go. Medium trees can come out with a tree review and replacement, so they cost a little and never hide a lot on their own. Open ground is the largest spot behind the house, at least 15 by 20 ft (300 sf), clear of the setbacks, 5 ft from the house, and clear of every large crown. The side strips beside the house are not counted, because they carry the driveway.
  - No 15 by 20 ft spot clear of large trees: the lot fails.
  - A DADU fits only once medium trees come out: the tree factor is 50 at most and the lot cannot be a top pick; with 4 or more medium trees to remove it is Fair at best.
  - Open ground under 600 sf: Fair at best.
  - Under 1,000 sf open with 4 or more large trees: Fair at best; with 6 or more: Marginal.
  - Otherwise the factor follows canopy (up to 10% open, 10 to 20% light, 20 to 30% moderate, 30 to 40% substantial, over 40% heavy), less 5 points for each large tree and 2 for each medium one. Canopy over 60% means no top pick.
  - Garages and sheds do not block the site: a DADU often replaces or converts them. Only the house keeps its 5 ft gap.
  - When the house itself leaves no 15 by 20 ft spot behind it, the search moves to the rest of the lot past the house's front wall (side yards included). If there is still none, that is a placement question, not a tree finding: the trees are scored on canopy and count, and the lot is Fair at best until a site visit confirms where a DADU goes.
  - A lot whose trees have not been measured cannot be a top pick.

## Grades
- Top pick: 93 and up. An interior lot tops out near 92, so a top pick in practice has alley or corner access.
- Good: 82 to 92.
- Fair: 70 to 81.
- Marginal: under 70.

## What the baseline cannot see
The baseline uses city data only. It cannot see what a listing describes: an existing garage, a side driveway, a separate-entry lower unit, or a layout that already matches the step-up home. Those are the reasons the AI reviewer may adjust the score.
