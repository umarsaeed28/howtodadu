import { describe, expect, it } from "vitest";
import { computeFar, isNeighborhoodResidential, maxFarForZone, maxFloorAreaForZone, nrFar, nrMaxFloorArea } from "../far";

describe("NR floor area ratio (SMC 23.44.050 Table A)", () => {
  it("sets FAR by lot area per dwelling unit", () => {
    expect(nrFar(8001, 2)).toBe(0.6); // 4,000.5 sf per unit: less dense than 1 / 4,000
    expect(nrFar(4000, 1)).toBe(0.8); // 1 / 4,000
    expect(nrFar(4402, 2)).toBe(0.8); // 1 / 2,201
    expect(nrFar(4400, 2)).toBe(1.0); // 1 / 2,200
    expect(nrFar(4000, 2)).toBe(1.0); // 1 / 2,000
    expect(nrFar(4803, 3)).toBe(1.0); // 1 / 1,601
    expect(nrFar(4800, 3)).toBe(1.6); // 1 / 1,600
  });

  it("lets a lot under 5,000 sf keep 2,500 sf whatever the FAR gives (SMC 23.44.050.B)", () => {
    expect(nrMaxFloorArea(3000, 1)).toBe(2500); // 0.8 x 3,000 = 2,400
    expect(nrMaxFloorArea(3000, 2)).toBe(4800); // 1.6 x 3,000
    expect(nrMaxFloorArea(5000, 1)).toBe(3000); // not under 5,000 sf, so no floor: 0.6 x 5,000
    expect(nrMaxFloorArea(8000, 1)).toBe(4800); // 0.6 x 8,000
  });

  it("5519 12th Ave NE: a house and a DADU on 4,000 sf allow FAR 1.0, 4,000 sf", () => {
    expect(maxFarForZone("NR3", 4000)).toBe(1.0);
    expect(maxFarForZone("SF 5000", 4000)).toBe(1.0);
    expect(maxFloorAreaForZone("NR3", 4000)).toBe(4000);
    expect(maxFloorAreaForZone("NR3", 4000, 1)).toBe(3200);
  });

  it("needs the lot size for NR, and keeps the placeholder estimates for other zones", () => {
    expect(maxFarForZone("NR3")).toBeNull();
    expect(maxFloorAreaForZone("NR3", null)).toBeNull();
    expect(maxFarForZone("LR3", 4000)).toBe(1.4);
    expect(maxFarForZone("LR2")).toBe(1.3);
    expect(maxFarForZone("RSL")).toBe(0.75);
    expect(maxFloorAreaForZone("LR1 (M)", 5000)).toBe(6000);
    expect(maxFarForZone(null)).toBeNull();
  });

  it("recognizes NR zones and their pre-2021 single-family names", () => {
    for (const z of ["NR1", "NR2", "NR3", "NR", "SF 5000", "sf 7200", "NR3 (M)"]) expect(isNeighborhoodResidential(z)).toBe(true);
    for (const z of ["LR1", "RSL", "NC2-55", "", null]) expect(isNeighborhoodResidential(z)).toBe(false);
  });

  it("computes an existing FAR from floor area and lot", () => {
    expect(computeFar(800, 4000)).toEqual({ ratio: 0.2, display: "0.20" });
    expect(computeFar(null, 4000).ratio).toBeNull();
  });
});
