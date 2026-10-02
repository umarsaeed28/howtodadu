type Pt = { x: number; y: number };

function hull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * The turn (radians, within ±45°) that squares a lot to the page: the angle of its minimum-area bounding rectangle.
 * Seattle's grid is mostly north-south, but many lots (curved streets, diagonal plats) sit at an angle. Drawing those
 * north-up makes the plan's frame a tilted box: wrong width and depth, and a DADU placed against the box, not the lot.
 * Turns under one degree are ignored so ordinary lots stay exactly north-up.
 */
export function lotRotation(pts: Pt[]): number {
  const h = hull(pts);
  if (h.length < 3) return 0;
  let best = { area: Infinity, angle: 0 };
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    if (Math.hypot(b.x - a.x, b.y - a.y) < 1) continue;
    const t = Math.atan2(b.y - a.y, b.x - a.x);
    const c = Math.cos(t), s = Math.sin(t);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const q of h) {
      const u = q.x * c + q.y * s, v = -q.x * s + q.y * c;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
    const area = (u1 - u0) * (v1 - v0);
    if (area < best.area - 1e-6) best = { area, angle: t };
  }
  // Any multiple of 90° squares the same rectangle; take the smallest turn.
  let t = best.angle % (Math.PI / 2);
  if (t > Math.PI / 4) t -= Math.PI / 2;
  if (t <= -Math.PI / 4) t += Math.PI / 2;
  return Math.abs(t) < Math.PI / 180 ? 0 : t;
}

/** Rotate a point by -theta, so a lot at angle theta comes out square. */
export const unturn = (p: Pt, theta: number): Pt => ({ x: p.x * Math.cos(theta) + p.y * Math.sin(theta), y: -p.x * Math.sin(theta) + p.y * Math.cos(theta) });
/** The inverse of `unturn`. */
export const turn = (p: Pt, theta: number): Pt => ({ x: p.x * Math.cos(theta) - p.y * Math.sin(theta), y: p.x * Math.sin(theta) + p.y * Math.cos(theta) });
