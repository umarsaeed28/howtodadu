import { describe, it, expect } from "vitest";
import { sitePlanGeometryStatus } from "../geometry-status";
import type { FeasibilityResult } from "@/lib/feasibility";

function result(partial: Partial<FeasibilityResult>): FeasibilityResult {
  return {
    coordinates: { lat: 47.6, lng: -122.3 },
    parcel: null,
    feasibility: null,
    lot: null,
    contours: [],
    ...partial,
  };
}

describe("sitePlanGeometryStatus", () => {
  it("rejects when parcel polygon is missing", () => {
    const r = sitePlanGeometryStatus(
      result({
        sitePlan: {
          buildings: [
            {
              rings: [
                [0, 0],
                [1, 0],
                [1, 1],
              ],
              area: 100,
            },
          ],
          trees: [],
          streets: [],
          driveways: [],
          adjacentParcels: [],
        },
      })
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/boundary/i);
  });

  it("rejects when building footprint is missing", () => {
    const r = sitePlanGeometryStatus(
      result({
        lot: {
          rings: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ],
          bbox: [0, 0, 1, 1],
          aerialUrl: "/api/aerial",
          imageSize: 800,
        },
        sitePlan: { buildings: [], trees: [], streets: [], driveways: [], adjacentParcels: [] },
      })
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/footprint/i);
  });

  it("accepts when both parcel polygon and GIS footprints exist", () => {
    const r = sitePlanGeometryStatus(
      result({
        lot: {
          rings: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ],
          bbox: [0, 0, 1, 1],
          aerialUrl: "/api/aerial",
          imageSize: 800,
        },
        sitePlan: {
          buildings: [
            {
              rings: [
                [0.2, 0.2],
                [0.5, 0.2],
                [0.5, 0.5],
                [0.2, 0.5],
              ],
              area: 400,
            },
          ],
          trees: [],
          streets: [],
          driveways: [],
          adjacentParcels: [],
        },
      })
    );
    expect(r.ok).toBe(true);
  });
});
