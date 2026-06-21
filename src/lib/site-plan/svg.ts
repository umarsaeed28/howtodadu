/** Project lng/lat rings into SVG coordinates for the site plan viewBox. */

export function toSvgPoint(
  lng: number,
  lat: number,
  bbox: [number, number, number, number],
  size: number
): { x: number; y: number } {
  const [xmin, ymin, xmax, ymax] = bbox;
  const x = ((lng - xmin) / (xmax - xmin)) * size;
  const y = (1 - (lat - ymin) / (ymax - ymin)) * size;
  return { x, y };
}

export function ringToSvgPath(
  ring: number[][],
  bbox: [number, number, number, number],
  size: number
): string {
  const deduped = ring.filter((pt, i) => {
    if (i === 0) return true;
    const prev = ring[i - 1];
    return pt[0] !== prev[0] || pt[1] !== prev[1];
  });
  if (deduped.length < 3) return "";
  return (
    deduped
      .map(([lng, lat], j) => {
        const { x, y } = toSvgPoint(lng, lat, bbox, size);
        return `${j === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ") + " Z"
  );
}

export function pathsToSvgPaths(
  paths: number[][][],
  bbox: [number, number, number, number],
  size: number
): string[] {
  return paths
    .filter((path) => path.length >= 2)
    .map((path) =>
      path
        .map(([lng, lat], j) => {
          const { x, y } = toSvgPoint(lng, lat, bbox, size);
          return `${j === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ")
    );
}

/** Approximate tree crown radius in SVG units from feet and lot bbox span. */
export function radiusFtToSvg(
  radiusFt: number,
  bbox: [number, number, number, number],
  size: number,
  lotWidthFt: number | null
): number {
  const [xmin, ymin, xmax, ymax] = bbox;
  const latMid = (ymin + ymax) / 2;
  const latScale = Math.cos((latMid * Math.PI) / 180);
  const spanLng = (xmax - xmin) * latScale;
  const spanLat = ymax - ymin;
  const spanFt = lotWidthFt && lotWidthFt > 0 ? lotWidthFt : Math.max(spanLng, spanLat) * 364000;
  const ftPerSvg = spanFt / size;
  return Math.max(2, radiusFt / Math.max(ftPerSvg, 1));
}
