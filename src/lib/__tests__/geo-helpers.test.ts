import { describe, it, expect } from "vitest";
import {
  normalizeAddr,
  pickBestParcel,
  clipPathToBbox,
  buildLotData,
  num,
  str,
  bool,
} from "../geo-helpers";

/* ═══════════════════════════════════════════════════════════
   normalizeAddr
   ═══════════════════════════════════════════════════════════ */

describe("normalizeAddr", () => {
  it("uppercases and trims", () => {
    expect(normalizeAddr("  hello world  ")).toBe("HELLO WORLD");
  });

  it("strips non-alphanumeric characters", () => {
    expect(normalizeAddr("4118 48th Ave. SW, Seattle")).toBe("4118 48TH AVE SW SEATTLE");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeAddr("123   Main   St")).toBe("123 MAIN ST");
  });

  it("handles empty string", () => {
    expect(normalizeAddr("")).toBe("");
  });
});

/* ═══════════════════════════════════════════════════════════
   pickBestParcel
   ═══════════════════════════════════════════════════════════ */

describe("pickBestParcel", () => {
  const feat = (address: string, lng: number, lat: number) => ({
    attributes: { ADDRESS: address },
    geometry: {
      rings: [
        [
          [lng - 0.0001, lat - 0.0001],
          [lng + 0.0001, lat - 0.0001],
          [lng + 0.0001, lat + 0.0001],
          [lng - 0.0001, lat + 0.0001],
        ],
      ],
    },
  });

  it("picks by address match when number and street match", () => {
    const features = [
      feat("4120 48TH AVE SW 98116", -122.384, 47.565),
      feat("4118 48TH AVE SW 98116", -122.383, 47.564),
      feat("4116 48TH AVE SW 98116", -122.382, 47.563),
    ];
    const result = pickBestParcel(features, -122.384, 47.565, "4118 48th Ave SW Seattle");
    expect(result.attributes.ADDRESS).toBe("4118 48TH AVE SW 98116");
  });

  it("falls back to closest centroid when no address match", () => {
    const features = [
      feat("9999 OTHER ST 98101", -122.400, 47.600),
      feat("8888 FAR ST 98102", -122.380, 47.562),
    ];
    const result = pickBestParcel(features, -122.381, 47.562, "1234 Nonexistent St");
    expect(result.attributes.ADDRESS).toBe("8888 FAR ST 98102");
  });

  it("returns first feature when no geometry available", () => {
    const features = [
      { attributes: { ADDRESS: "A" }, geometry: null },
      { attributes: { ADDRESS: "B" }, geometry: null },
    ];
    const result = pickBestParcel(features, 0, 0, "something");
    expect(result.attributes.ADDRESS).toBe("A");
  });

  it("handles single feature", () => {
    const features = [feat("ONLY ONE 98101", -122.3, 47.6)];
    const result = pickBestParcel(features, -122.3, 47.6, "anything");
    expect(result.attributes.ADDRESS).toBe("ONLY ONE 98101");
  });

  it("strips city/state from search for matching", () => {
    const features = [
      feat("1234 MAIN ST 98101", -122.35, 47.61),
      feat("5678 OTHER ST 98102", -122.33, 47.60),
    ];
    const result = pickBestParcel(features, -122.33, 47.60, "1234 Main St Seattle WA 98101");
    expect(result.attributes.ADDRESS).toBe("1234 MAIN ST 98101");
  });
});

/* ═══════════════════════════════════════════════════════════
   clipPathToBbox
   ═══════════════════════════════════════════════════════════ */

describe("clipPathToBbox", () => {
  const bbox = { xmin: 0, ymin: 0, xmax: 10, ymax: 10 };

  it("returns single segment when all points are inside", () => {
    const path = [[1, 1], [5, 5], [9, 9]];
    const result = clipPathToBbox(path, bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(3);
  });

  it("returns empty when all points are outside", () => {
    const path = [[20, 20], [30, 30], [40, 40]];
    const result = clipPathToBbox(path, bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax);
    expect(result).toHaveLength(0);
  });

  it("splits into multiple segments when path crosses in and out", () => {
    const path = [
      [1, 1], [5, 5],       // inside
      [15, 15],              // outside
      [3, 3], [7, 7],       // inside again
      [20, 20],              // outside
    ];
    const result = clipPathToBbox(path, bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([[1, 1], [5, 5]]);
    expect(result[1]).toEqual([[3, 3], [7, 7]]);
  });

  it("discards single-point segments", () => {
    const path = [
      [15, 15],  // outside
      [5, 5],    // single point inside
      [15, 15],  // outside
    ];
    const result = clipPathToBbox(path, bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax);
    expect(result).toHaveLength(0);
  });

  it("handles points exactly on boundary as inside", () => {
    const path = [[0, 0], [10, 10]];
    const result = clipPathToBbox(path, bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
  });

  it("handles empty path", () => {
    const result = clipPathToBbox([], bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax);
    expect(result).toHaveLength(0);
  });

  it("handles real-world coordinate scale", () => {
    const xmin = -122.395;
    const ymin = 47.560;
    const xmax = -122.380;
    const ymax = 47.570;
    const path = [
      [-122.500, 47.565],  // outside (west)
      [-122.390, 47.565],  // inside
      [-122.385, 47.565],  // inside
      [-122.370, 47.565],  // outside (east)
    ];
    const result = clipPathToBbox(path, xmin, ymin, xmax, ymax);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
  });
});

/* ═══════════════════════════════════════════════════════════
   buildLotData
   ═══════════════════════════════════════════════════════════ */

describe("buildLotData", () => {
  const sampleRings: number[][] = [
    [-122.385, 47.562],
    [-122.384, 47.562],
    [-122.384, 47.563],
    [-122.385, 47.563],
  ];

  it("returns null for fewer than 3 points", () => {
    expect(buildLotData([[0, 0], [1, 1]])).toBeNull();
  });

  it("returns valid structure for valid rings", () => {
    const result = buildLotData(sampleRings);
    expect(result).not.toBeNull();
    expect(result!.rings).toBe(sampleRings);
    expect(result!.bbox).toHaveLength(4);
    expect(result!.imageSize).toBe(800);
    expect(result!.aerialUrl).toContain("/api/aerial");
    expect(result!.aerialUrl).toContain("style=topo");
  });

  it("bbox encompasses the parcel with padding", () => {
    const result = buildLotData(sampleRings)!;
    const [xmin, ymin, xmax, ymax] = result.bbox;
    expect(xmin).toBeLessThan(-122.385);
    expect(xmax).toBeGreaterThan(-122.384);
    expect(ymin).toBeLessThan(47.562);
    expect(ymax).toBeGreaterThan(47.563);
  });

  it("enforces minimum bbox span of ~0.002 degrees", () => {
    const tinyRings = [
      [-122.3850, 47.5620],
      [-122.3849, 47.5620],
      [-122.3849, 47.5621],
    ];
    const result = buildLotData(tinyRings)!;
    const [, ymin, , ymax] = result.bbox;
    const latSpan = ymax - ymin;
    expect(latSpan).toBeCloseTo(0.002, 4);
  });

  it("produces a square image URL", () => {
    const result = buildLotData(sampleRings)!;
    expect(result.aerialUrl).toContain("size=800,800");
  });
});

/* ═══════════════════════════════════════════════════════════
   Type coercion helpers
   ═══════════════════════════════════════════════════════════ */

describe("num", () => {
  it("returns number for valid numbers", () => {
    expect(num(42)).toBe(42);
    expect(num(0)).toBe(0);
    expect(num(-5.5)).toBe(-5.5);
  });

  it("returns null for non-numbers", () => {
    expect(num(null)).toBeNull();
    expect(num(undefined)).toBeNull();
    expect(num("42")).toBeNull();
    expect(num(NaN)).toBeNull();
  });
});

describe("str", () => {
  it("returns trimmed string for valid strings", () => {
    expect(str("  hello  ")).toBe("hello");
    expect(str("world")).toBe("world");
  });

  it("returns null for empty or non-strings", () => {
    expect(str("")).toBeNull();
    expect(str("   ")).toBeNull();
    expect(str(null)).toBeNull();
    expect(str(undefined)).toBeNull();
    expect(str(42)).toBeNull();
  });
});

describe("bool", () => {
  it("returns true for 1, '1', and true", () => {
    expect(bool(1)).toBe(true);
    expect(bool("1")).toBe(true);
    expect(bool(true)).toBe(true);
  });

  it("returns false for everything else", () => {
    expect(bool(0)).toBe(false);
    expect(bool("0")).toBe(false);
    expect(bool(false)).toBe(false);
    expect(bool(null)).toBe(false);
    expect(bool(undefined)).toBe(false);
    expect(bool("yes")).toBe(false);
  });
});
