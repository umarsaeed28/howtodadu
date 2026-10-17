import { NextRequest, NextResponse } from "next/server";
import { getFeasibilityForAddress } from "@/lib/server/feasibility-query";
import { resolveParcel } from "@/lib/server/parcel-lookup";
import { headlineUnits, lotFeasibility, lotFeasibilityInputFrom, type LotFeasibilityOverrides } from "@/lib/feasibility/lot-feasibility";
import { adminOnly } from "@/lib/admin/gate";

/** A non-negative integer (or number) query parameter, undefined when absent, null when malformed. */
function param(sp: URLSearchParams, name: string, integer: boolean, max: number): number | undefined | null {
  const raw = sp.get(name);
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > max || (integer && !Number.isInteger(n))) return null;
  return n;
}

/**
 * GET /api/feasibility/lot?pin=0004000070 or ?address=... → the lot's DADU feasibility in the spec's
 * SeattleLotFeasibilityOutput shape (src/lib/feasibility/lot-feasibility.ts). Optional overrides: units (dwelling
 * units for the headline FAR, house included), bedrooms (per new unit; 3+ raises the cap to 1,200 sq ft) and
 * existing_floor_sqft (the house's above-grade floor area; city records only give its footprint) and garage (sq ft of a
 * garage attached to the DADU, which adds a "DADU with attached garage" option; up to 250 sq ft is exempt from the cap).
 */
export async function GET(request: NextRequest) {
  const denied = await adminOnly(request); // lot data is admin-only (src/lib/admin/gate.ts)
  if (denied) return denied;
  const sp = request.nextUrl.searchParams;
  const pin = sp.get("pin")?.trim() || null;
  let address = sp.get("address")?.trim() || null;
  if (!pin && !address) return NextResponse.json({ error: "pin or address is required" }, { status: 400 });
  if (pin && !/^\d{10}$/.test(pin)) return NextResponse.json({ error: "pin must be 10 digits" }, { status: 400 });

  const units = param(sp, "units", true, 50);
  const bedrooms = param(sp, "bedrooms", true, 10);
  const existingFloor = param(sp, "existing_floor_sqft", false, 1_000_000);
  const garage = param(sp, "garage", false, 10_000);
  if (units === null || units === 0) return NextResponse.json({ error: "units must be a whole number from 1 to 50" }, { status: 400 });
  if (bedrooms === null) return NextResponse.json({ error: "bedrooms must be a whole number from 0 to 10" }, { status: 400 });
  if (existingFloor === null) return NextResponse.json({ error: "existing_floor_sqft must be a non-negative number" }, { status: 400 });
  if (garage === null) return NextResponse.json({ error: "garage must be a number of sq ft from 0 to 10,000" }, { status: 400 });

  if (pin && !address) {
    address = (await resolveParcel(pin))?.address ?? null;
    if (!address) return NextResponse.json({ error: "Parcel not found" }, { status: 404 });
  }

  const outcome = await getFeasibilityForAddress(address!);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error, code: outcome.code, zoning: outcome.zoning }, { status: outcome.status });
  }
  const parcel = outcome.data.parcel;
  // The address of a PIN can geocode onto a neighbour; answer only for the parcel asked for.
  if (pin && parcel?.pin && parcel.pin !== pin) {
    return NextResponse.json({ error: `The address for parcel ${pin} resolved to parcel ${parcel.pin}` }, { status: 404 });
  }

  const overrides: LotFeasibilityOverrides = { units, bedrooms, existingChargeableSqft: existingFloor, garageSqft: garage };
  const built = lotFeasibilityInputFrom(outcome.data, overrides);
  if (!built) return NextResponse.json({ error: "No lot size on record for this parcel" }, { status: 422 });

  return NextResponse.json({
    ...lotFeasibility(built.input),
    // Not in the spec's schema (which allows extra keys): what the numbers were computed from.
    inputs: {
      pin: parcel?.pin ?? pin,
      address: parcel?.address ?? address,
      zoning: parcel?.zoning ?? null,
      lot_sqft: built.input.lotSqft,
      existing_footprint_sqft: built.input.existingFootprintSqft,
      existing_chargeable_sqft: built.input.existingChargeableSqft,
      existing_chargeable_source: built.existingChargeableSource,
      existing_adus: built.input.existingAdus,
      units: headlineUnits(built.input),
      bedrooms: built.input.bedrooms ?? 2,
      open_spot_sqft: built.input.roomSqft ?? null,
      has_alley: built.input.hasAlley ?? false,
      garage_sqft: built.input.garageSqft ?? 0,
    },
  });
}
