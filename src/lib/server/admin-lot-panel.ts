import "server-only";
import { getFeasibilityForAddress } from "@/lib/server/feasibility-query";
import { resolveParcel } from "@/lib/server/parcel-lookup";
import { lotFeasibility, lotFeasibilityInputFrom, type SeattleLotFeasibilityOutput } from "@/lib/feasibility/lot-feasibility";
import { buildConstraintSet, validateLot, type Constraint, type ValidatorReport } from "@/lib/rules/constraint-set";
import { calculatorHref } from "@/lib/calculator/inputs";
import { ADU } from "@/lib/rules/seattle-adu";
import { nearbyPrecedents, type Precedent } from "@/lib/server/plan-library";
import type { AdminEnv } from "@/lib/admin/env";

/** Everything the admin lot panel shows for one parcel. */
export interface AdminLotPanel {
  pin: string;
  address: string;
  parcel: { zoning: string | null; lotSqft: number; widthFt: number | null; depthFt: number | null; yearBuilt: string | number | null; alley: boolean; existingAdus: number; footprintSqft: number; lat: number | null; lng: number | null };
  constraints: Constraint[];
  validator: ValidatorReport;
  playbook: SeattleLotFeasibilityOutput;
  proformaHref: string;
  precedents: Precedent[];
}

export async function loadAdminLotPanel(pin: string, env: AdminEnv | null): Promise<{ ok: true; panel: AdminLotPanel } | { ok: false; status: number; error: string }> {
  const address = (await resolveParcel(pin))?.address;
  if (!address) return { ok: false, status: 404, error: "Parcel not found" };
  const outcome = await getFeasibilityForAddress(address);
  if (!outcome.ok) return { ok: false, status: outcome.status, error: outcome.error };
  const built = lotFeasibilityInputFrom(outcome.data);
  if (!built) return { ok: false, status: 422, error: "No lot size on record for this parcel" };
  const p = outcome.data.parcel;
  const f = outcome.data.feasibility;
  const input = built.input;
  const playbook = lotFeasibility(input);
  const constraints = buildConstraintSet({ ...input, zoning: p?.zoning ?? null });
  const validator = validateLot(constraints, playbook, { existingChargeableSource: built.existingChargeableSource, roomSqft: input.roomSqft });
  // The lot's centre from its bounding box ([west, south, east, north] in degrees).
  const bb = outcome.data.lot?.bbox;
  const lng = bb ? (bb[0] + bb[2]) / 2 : null;
  const lat = bb ? (bb[1] + bb[3]) / 2 : null;
  return {
    ok: true,
    panel: {
      pin,
      address: p?.address ?? address,
      parcel: {
        zoning: p?.zoning ?? null,
        lotSqft: input.lotSqft,
        widthFt: f?.lotWidth ?? null,
        depthFt: f?.lotDepth ?? null,
        yearBuilt: p?.yearBuilt ?? null,
        alley: !!input.hasAlley,
        existingAdus: input.existingAdus,
        footprintSqft: input.existingFootprintSqft,
        lat,
        lng,
      },
      constraints,
      validator,
      playbook,
      proformaHref: calculatorHref({ sf: ADU.maxGrossSqft.value, address: p?.address ?? address, houseSqft: null }),
      precedents: lat != null && lng != null ? await nearbyPrecedents(env, lat, lng).catch(() => []) : [],
    },
  };
}
