const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function hasCoords(lat?: number | null, lng?: number | null): lat is number {
  return (
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
  );
}

/**
 * Free Esri World Imagery aerial centered on a point. `span` is the half-width
 * of the view in degrees of longitude (smaller = closer). Real imagery, no key.
 */
export function aerialPhoto(
  lat: number,
  lng: number,
  span = 0.0011,
  size = "640,420"
): string {
  const dLng = span;
  const dLat = span * 0.68;
  const bbox = `${lng - dLng},${lat - dLat},${lng + dLng},${lat + dLat}`;
  const params = new URLSearchParams({
    bbox,
    bboxSR: "4326",
    imageSR: "3857",
    size,
    format: "jpg",
    f: "image",
  });
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?${params}`;
}

/**
 * Real photo of a property.
 * Prefers Google Street View (street-level) when a key is configured, otherwise
 * falls back to free Esri World Imagery aerial centered on the coordinates. Both
 * are actual imagery of the location. A seeded placeholder is used only when we
 * have no coordinates.
 */
export function propertyPhoto(
  address: string,
  lat?: number | null,
  lng?: number | null
): string {
  if (hasCoords(lat, lng)) {
    if (GOOGLE_KEY) {
      const params = new URLSearchParams({
        size: "640x420",
        location: `${lat},${lng}`,
        fov: "80",
        pitch: "8",
        source: "outdoor",
        key: GOOGLE_KEY,
      });
      return `https://maps.googleapis.com/maps/api/streetview?${params}`;
    }
    return aerialPhoto(lat, lng!);
  }
  const seed = encodeURIComponent(address.trim().toLowerCase() || "seattle");
  return `https://picsum.photos/seed/htd-${seed}/640/420`;
}

/** Deep link to the Zillow listing/search for an address. */
export function zillowUrl(address: string): string {
  const a = address.trim().replace(/\s+/g, " ");
  return `https://www.zillow.com/homes/${encodeURIComponent(a)}_rb/`;
}
