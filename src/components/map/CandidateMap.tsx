"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Map, Source, Layer, Marker, NavigationControl, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import { ArrowLeft, ArrowRight, Calculator, Loader2, Search, Star } from "lucide-react";
import type { Candidate } from "@/lib/server/candidates";
import type { MapListing } from "@/app/api/map-listings/route";
import { COST_LABEL, COST_PER_SF, constructionEstimate } from "@/lib/config/costs";
import { calculatorHref } from "@/lib/calculator/inputs";

const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE ?? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const SEATTLE = { longitude: -122.335, latitude: 47.62, zoom: 10.6 };
/** Lot outlines load below this width (degrees of longitude), roughly zoom 16 and closer. */
const SHAPE_SPAN = 0.02;
const PANEL_W = 392;

/** Only greens are shown: top picks and good lots, score 80 and up. */
export const TIERS = [
  { id: 3, label: "Top pick", note: "Corner or alley, clean site, scores 85 and up", color: "#145A40" },
  { id: 2, label: "Good", note: "Scores 80 and up", color: "#6CB98A" },
] as const;
const tierColor = (t: number) => TIERS.find((x) => x.id === t)?.color ?? "#6CB98A";
const tierLabel = (t: number) => TIERS.find((x) => x.id === t)?.label ?? "Good";

interface Slim {
  count: number;
  pin: string[];
  lat: number[];
  lng: number[];
  score: number[];
  tier: number[];
  flags: number[];
  zip: (string | null)[];
}
interface ZipInfo { zip: string; lots: number; topPicks: number }
interface ListingsInfo { connected: boolean; source: string | null }

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const cleanAddress = (a: string) => titleCase(a.replace(/\s+\d{5}$/, ""));
const pctOf = (v: number | null) => (v == null ? null : Math.round(v <= 1 ? v * 100 : v));
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const usdShort = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`);

/** Keep the lot clear of the docked panel: the panel is on the left on desktop and at the bottom on mobile. */
function viewPadding(detailOpen: boolean) {
  if (typeof window === "undefined") return { top: 40, bottom: 40, left: 40, right: 40 };
  if (window.innerWidth >= 768) return { top: 48, bottom: 48, left: PANEL_W + 32, right: 48 };
  return { top: 72, bottom: Math.round(window.innerHeight * (detailOpen ? 0.5 : 0.3)), left: 24, right: 24 };
}

export default function CandidateMap() {
  const mapRef = useRef<MapRef | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const initial = useRef(typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams());

  const [slim, setSlim] = useState<Slim | null>(null);
  const [slimKey, setSlimKey] = useState<string | null>(null);
  const [zips, setZips] = useState<ZipInfo[]>([]);
  const [zipInput, setZipInput] = useState(initial.current.get("zip") ?? "");
  const [zipSel, setZipSel] = useState<string[]>(() => (initial.current.get("zip") ?? "").split(",").filter((z) => /^98\d{3}$/.test(z)));
  const [loadingLots, setLoadingLots] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<MapListing[]>([]);
  const [listingsInfo, setListingsInfo] = useState<ListingsInfo | null>(null);
  const [shapes, setShapes] = useState<GeoJSON.FeatureCollection | null>(null);
  const [shapeHint, setShapeHint] = useState(false);
  const [selectedPin, setSelectedPin] = useState<string | null>(() => {
    const p = initial.current.get("pin");
    return p && /^\d{10}$/.test(p) ? p : null;
  });
  const [detail, setDetail] = useState<Candidate | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [topOnly, setTopOnly] = useState(false);
  const [cornerOnly, setCornerOnly] = useState(false);
  const [alleyOnly, setAlleyOnly] = useState(false);
  const [showAlleys, setShowAlleys] = useState(true);
  const [alleysGeo, setAlleysGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [addr, setAddr] = useState("");
  const [searching, setSearching] = useState(false);
  const shapeKey = useRef("");
  const fitted = useRef("");
  const flownFor = useRef<string | null>(null);
  const pendingFly = useRef<{ lng: number; lat: number } | null>(null);

  /* ---- lot library, by ZIP or the whole city ---- */
  useEffect(() => {
    const ctl = new AbortController();
    setLoadingLots(true);
    setError(null);
    fetch(`/api/lots${zipSel.length ? `?zip=${zipSel.join(",")}` : ""}`, { signal: ctl.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not load lots.");
        setSlim(d.lots as Slim);
        setSlimKey(zipSel.join(",") || "all");
        setZips((z) => (z.length ? z : (d.zips as ZipInfo[])));
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Could not load lots.");
      })
      .finally(() => setLoadingLots(false));
    return () => ctl.abort();
  }, [zipSel]);

  /* ---- every public alley in Seattle (city right-of-way polygons) ---- */
  useEffect(() => {
    const ctl = new AbortController();
    fetch("/api/alleys", { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAlleysGeo(d as GeoJSON.FeatureCollection))
      .catch(() => {});
    return () => ctl.abort();
  }, []);

  /* ---- MLS listings that sit on good lots ---- */
  useEffect(() => {
    const ctl = new AbortController();
    fetch(`/api/map-listings${zipSel.length ? `?zip=${zipSel.join(",")}` : ""}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        setListings(d.listings ?? []);
        setListingsInfo({ connected: !!d.connected, source: d.source ?? null });
      })
      .catch(() => {});
    return () => ctl.abort();
  }, [zipSel]);

  /* ---- keep the address bar in step so any view can be shared ---- */
  useEffect(() => {
    const q = new URLSearchParams();
    if (zipSel.length) q.set("zip", zipSel.join(","));
    if (selectedPin) q.set("pin", selectedPin);
    const next = `${window.location.pathname}${q.toString() ? `?${q}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next);
  }, [zipSel, selectedPin]);

  const index = useMemo(() => {
    const m = new globalThis.Map<string, number>();
    slim?.pin.forEach((p, i) => m.set(p, i));
    return m;
  }, [slim]);

  /* ---- fit the map to the chosen ZIPs (not when a lot is deep-linked) ---- */
  useEffect(() => {
    if (!slim || !slim.count || !slimKey) return;
    if (fitted.current === slimKey) return;
    fitted.current = slimKey;
    if (selectedPin && slimKey === "all") return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    let w = 180, s = 90, e = -180, n = -90;
    for (let i = 0; i < slim.count; i++) {
      if (slim.lng[i] < w) w = slim.lng[i];
      if (slim.lng[i] > e) e = slim.lng[i];
      if (slim.lat[i] < s) s = slim.lat[i];
      if (slim.lat[i] > n) n = slim.lat[i];
    }
    map.fitBounds([[w, s], [e, n]], { padding: viewPadding(false), duration: 800, maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slim, slimKey]);

  const visible = useMemo(() => {
    if (!slim) return [] as number[];
    const out: number[] = [];
    for (let i = 0; i < slim.count; i++) {
      if (topOnly && slim.tier[i] < 3) continue;
      if (cornerOnly && !(slim.flags[i] & 1)) continue;
      if (alleyOnly && !(slim.flags[i] & 2)) continue;
      out.push(i);
    }
    return out;
  }, [slim, topOnly, cornerOnly, alleyOnly]);

  const points = useMemo<GeoJSON.FeatureCollection>(() => {
    const s = slim;
    return {
      type: "FeatureCollection",
      features: s
        ? visible.map((i) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [s.lng[i], s.lat[i]] },
            properties: { pin: s.pin[i], tier: s.tier[i], corner: (s.flags[i] & 1) === 1, alley: (s.flags[i] & 2) === 2 },
          }))
        : [],
    };
  }, [slim, visible]);

  const stats = useMemo(() => {
    let top = 0, corner = 0, alley = 0;
    if (slim) for (const i of visible) {
      if (slim.tier[i] === 3) top++;
      if (slim.flags[i] & 1) corner++;
      if (slim.flags[i] & 2) alley++;
    }
    return { lots: visible.length, top, corner, alley };
  }, [slim, visible]);

  /* ---- lot outlines at street zoom ---- */
  const loadShapes = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const b = map.getBounds();
    if (b.getEast() - b.getWest() > SHAPE_SPAN) {
      setShapeHint(true);
      return;
    }
    setShapeHint(false);
    const box: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    const key = box.map((v) => v.toFixed(4)).join(",");
    if (shapeKey.current === key) return;
    shapeKey.current = key;
    try {
      const r = await fetch(`/api/lot-shapes?bbox=${box.map((v) => v.toFixed(5)).join(",")}`);
      if (r.ok) setShapes(await r.json());
    } catch {
      /* outlines are an enhancement; the dots still show */
    }
  }, []);

  const shapesColored = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!shapes || !slim) return null;
    return {
      type: "FeatureCollection",
      features: shapes.features
        .filter((f) => index.has(String(f.properties?.pin)))
        .map((f) => {
          const i = index.get(String(f.properties?.pin))!;
          return { ...f, properties: { pin: slim.pin[i], tier: slim.tier[i], corner: (slim.flags[i] & 1) === 1, alley: (slim.flags[i] & 2) === 2 } };
        }),
    };
  }, [shapes, slim, index]);

  /* ---- selecting a lot: ease the map so the lot stays clear of the docked panel ---- */
  const flyToLot = useCallback((lng: number, lat: number) => {
    const map = mapRef.current?.getMap();
    if (!map) {
      pendingFly.current = { lng, lat }; // the map is still loading (deep link): fly once it is ready
      return;
    }
    map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16.8), padding: viewPadding(true), duration: 650 });
  }, []);

  const selectPin = useCallback(
    (pin: string | null) => {
      setSelectedPin(pin);
      setDetailError(null);
      if (!pin) return;
      const i = index.get(pin);
      if (i !== undefined && slim) {
        flownFor.current = pin;
        flyToLot(slim.lng[i], slim.lat[i]);
      } else {
        flownFor.current = null;
      }
    },
    [index, slim, flyToLot]
  );

  /* ---- selected lot detail (also serves ?pin= deep links) ---- */
  useEffect(() => {
    if (!selectedPin) {
      setDetail(null);
      return;
    }
    const ctl = new AbortController();
    setDetail(null);
    fetch(`/api/lot?pin=${selectedPin}`, { signal: ctl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "That lot is not in the library." : "Could not load that lot.");
        return r.json() as Promise<Candidate>;
      })
      .then((d) => {
        setDetail(d);
        if (flownFor.current !== d.pin) {
          flownFor.current = d.pin;
          flyToLot(d.lng, d.lat);
        }
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setDetailError(e instanceof Error ? e.message : "Could not load that lot.");
      });
    return () => ctl.abort();
  }, [selectedPin, flyToLot]);

  /* ---- move focus to the panel when it changes, close with Escape ---- */
  useEffect(() => {
    if (selectedPin) panelRef.current?.focus({ preventScroll: true });
  }, [selectedPin]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedPin) selectPin(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedPin, selectPin]);

  /* ---- test hook (only when built for end-to-end tests) ---- */
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E === "1") {
      (window as unknown as { __pencil?: unknown }).__pencil = { selectPin, getMap: () => mapRef.current?.getMap(), lotCount: slim?.count ?? 0 };
    }
  });

  const onClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      selectPin(f ? String(f.properties?.pin) : null);
    },
    [selectPin]
  );

  function applyZips(raw: string) {
    const tokens = raw.split(/[\s,]+/).filter(Boolean);
    const valid = tokens.filter((t) => zips.some((z) => z.zip === t));
    setZipSel(valid);
    setError(tokens.length && !valid.length ? "No lots in that ZIP code. Pick one from the list." : null);
  }

  async function findAddress(e: React.FormEvent) {
    e.preventDefault();
    const q = addr.trim();
    if (q.length < 3) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const list = (await res.json()) as { lat: number; lng: number }[];
      if (list[0]) mapRef.current?.getMap().easeTo({ center: [list[0].lng, list[0].lat], zoom: 17, padding: viewPadding(false), duration: 900 });
      else setError("No Seattle address matched that search.");
    } catch {
      setError("Address search is unavailable right now.");
    } finally {
      setSearching(false);
    }
  }

  const fill = ["match", ["get", "tier"], 3, TIERS[0].color, TIERS[1].color] as unknown as string;
  const ring = ["case", ["==", ["get", "corner"], true], "#17241D", ["==", ["get", "alley"], true], "#2E5C6E", "#ffffff"] as unknown as string;
  const listingTop = listings.filter((l) => l.tier === 3).length;
  const detailOpen = selectedPin !== null;

  return (
    <div className="relative h-[calc(100dvh_-_var(--nav-h))] w-full overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={SEATTLE}
        mapStyle={MAP_STYLE}
        onLoad={() => {
          void loadShapes();
          const p = pendingFly.current;
          if (p) {
            pendingFly.current = null;
            mapRef.current?.getMap().jumpTo({ center: [p.lng, p.lat], zoom: 16.8, padding: viewPadding(true) });
          }
        }}
        onMoveEnd={loadShapes}
        onClick={onClick}
        interactiveLayerIds={["lot-fill", "lot-points"]}
        attributionControl={{ compact: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {showAlleys && alleysGeo && (
          <Source id="alleys" type="geojson" data={alleysGeo}>
            <Layer id="alley-fill" type="fill" minzoom={11} paint={{ "fill-color": "#2E5C6E", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0.5, 16, 0.38] }} />
            <Layer id="alley-line" type="line" minzoom={11} paint={{ "line-color": "#2E5C6E", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.4, 14, 1.8, 17, 1.6], "line-opacity": 0.9 }} />
          </Source>
        )}

        {shapesColored && (
          <Source id="lot-shapes" type="geojson" data={shapesColored}>
            <Layer id="lot-fill" type="fill" paint={{ "fill-color": fill, "fill-opacity": 0.55 }} />
            <Layer id="lot-outline" type="line" paint={{ "line-color": ring, "line-width": ["case", ["==", ["get", "pin"], selectedPin ?? ""], 3.5, 1.2] }} />
          </Source>
        )}

        <Source id="lots" type="geojson" data={points}>
          <Layer
            id="lot-points"
            type="circle"
            paint={{
              "circle-color": fill,
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 1.1, 12, 2, 14, 3.4, 16, 6, 18, 9],
              "circle-opacity": ["interpolate", ["linear"], ["zoom"], 15.5, 0.9, 17, 0.25],
              "circle-stroke-color": ring,
              "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 12, 0, 14, 0.8, 17, 1.4],
              "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], 15.5, 1, 17, 0.3],
            }}
          />
          <Layer
            id="top-glow"
            type="circle"
            minzoom={12.5}
            filter={["==", ["get", "tier"], 3]}
            paint={{
              "circle-color": "rgba(0,0,0,0)",
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 12.5, 4, 14, 8, 17, 15],
              "circle-stroke-color": TIERS[0].color,
              "circle-stroke-width": 1.2,
              "circle-stroke-opacity": 0.6,
            }}
          />
          <Layer
            id="selected"
            type="circle"
            filter={["==", ["get", "pin"], selectedPin ?? "__none__"]}
            paint={{ "circle-color": "rgba(0,0,0,0)", "circle-radius": 14, "circle-stroke-color": "#17241D", "circle-stroke-width": 3 }}
          />
        </Source>

        {listings.map((l) => (
          <Marker key={l.mlsId} longitude={l.lng} latitude={l.lat} anchor="bottom">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selectPin(l.pin);
              }}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-white"
              style={{ background: tierColor(l.tier), boxShadow: "0 2px 8px rgba(23,36,29,.3)", border: "1.5px solid #fff" }}
              aria-label={`${l.tier === 3 ? "Top pick" : "Good"} listing at ${cleanAddress(l.address)}, ${usdShort(l.price)}`}
            >
              {l.tier === 3 && <Star size={11} aria-hidden fill="#fff" />}
              {usdShort(l.price)}
            </button>
          </Marker>
        ))}
      </Map>

      {/* Docked panel: left column on desktop, bottom sheet on mobile */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        aria-label={detailOpen ? "Lot details" : "Lot finder"}
        className="absolute inset-x-0 bottom-0 z-10 flex max-h-[56vh] flex-col overflow-hidden rounded-t-[18px] outline-none md:inset-y-0 md:left-0 md:right-auto md:max-h-none md:rounded-none"
        style={{ background: "var(--bg)", boxShadow: "0 -8px 28px -10px rgba(23,36,29,.28)" }}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full md:hidden" style={{ background: "var(--line-strong)" }} aria-hidden />
        <div className="min-h-0 flex-1 overflow-y-auto md:w-[392px]">
          {detailOpen ? (
            <LotPanel pin={selectedPin} lot={detail} error={detailError} listing={listings.find((l) => l.pin === selectedPin) ?? null} onBack={() => selectPin(null)} />
          ) : (
            <div className="p-5">
              <h1 className="pa-display text-xl" style={{ color: "var(--ink)" }}>Lots that can take a DADU</h1>
              <p className="mt-1 text-sm" style={{ color: "var(--slate)" }} aria-live="polite">
                {loadingLots
                  ? "Loading the lot library…"
                  : `${stats.lots.toLocaleString()} single-family lots${zipSel.length ? ` in ${zipSel.join(", ")}` : " across Seattle"}, ${stats.top.toLocaleString()} top picks`}
              </p>

              <label htmlFor="zip-input" className="mt-4 block text-xs font-semibold" style={{ color: "var(--ink)" }}>ZIP codes</label>
              <div className="mt-1 flex gap-2">
                <input
                  id="zip-input"
                  list="zip-list"
                  value={zipInput}
                  onChange={(e) => setZipInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyZips(zipInput)}
                  onBlur={() => applyZips(zipInput)}
                  placeholder="All of Seattle, or 98103, 98107"
                  className="min-w-0 flex-1 px-3 py-2 text-sm"
                  inputMode="numeric"
                  autoComplete="off"
                />
                <button type="button" className="pa-btn pa-btn-sm" onClick={() => { setZipInput(""); setZipSel([]); setError(null); }} disabled={!zipSel.length}>
                  All
                </button>
              </div>
              <datalist id="zip-list">
                {zips.map((z) => (
                  <option key={z.zip} value={z.zip}>{`${z.zip}, ${z.lots.toLocaleString()} lots`}</option>
                ))}
              </datalist>

              <form onSubmit={findAddress} className="mt-3">
                <label htmlFor="addr-input" className="sr-only">Find an address</label>
                <div className="pa-inset flex items-center gap-2 px-3" style={{ minHeight: 42 }}>
                  <Search size={15} aria-hidden style={{ color: "var(--slate)" }} />
                  <input id="addr-input" type="text" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Find an address" className="w-full bg-transparent py-2 text-sm outline-none" autoComplete="off" />
                  {searching && <Loader2 size={14} className="animate-spin" aria-hidden />}
                </div>
              </form>

              <fieldset className="mt-4">
                <legend className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Show only</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Chip on={topOnly} onClick={() => setTopOnly((v) => !v)}>Top picks</Chip>
                  <Chip on={cornerOnly} onClick={() => setCornerOnly((v) => !v)}>Corner {stats.corner ? `(${stats.corner.toLocaleString()})` : ""}</Chip>
                  <Chip on={alleyOnly} onClick={() => setAlleyOnly((v) => !v)}>Alley {stats.alley ? `(${stats.alley.toLocaleString()})` : ""}</Chip>
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs" style={{ color: "var(--ink)" }}>
                  <input type="checkbox" checked={showAlleys} onChange={(e) => setShowAlleys(e.target.checked)} />
                  Draw every public alley on the map{alleysGeo ? ` (${alleysGeo.features.length.toLocaleString()})` : ""}
                </label>
              </fieldset>

              <ul className="mt-5 flex flex-col gap-2">
                {TIERS.map((t) => (
                  <li key={t.id} className="flex items-start gap-2.5 text-xs" style={{ color: "var(--slate)" }}>
                    <span aria-hidden className="mt-0.5 h-3 w-3 shrink-0 rounded-[4px]" style={{ background: t.color }} />
                    <span><span className="font-semibold" style={{ color: "var(--ink)" }}>{t.label}</span>, {t.note}</span>
                  </li>
                ))}
                {showAlleys && (
                  <li className="flex items-start gap-2.5 text-xs" style={{ color: "var(--slate)" }}>
                    <span aria-hidden className="mt-0.5 h-3 w-3 shrink-0 rounded-[3px]" style={{ background: "#2E5C6E", opacity: 0.8 }} />
                    <span><span className="font-semibold" style={{ color: "var(--ink)" }}>Alley</span>, public right-of-way from city data</span>
                  </li>
                )}
                <li className="text-xs" style={{ color: "var(--slate)" }}>A dark ring marks a corner lot and a blue ring marks an alley lot. Lots below 80 are hidden.</li>
              </ul>

              <p className="mt-4 text-xs" style={{ color: "var(--slate)" }}>
                {listingsInfo && !listingsInfo.connected
                  ? "MLS listings are not connected yet. Price pins will mark for-sale lots once they are."
                  : listings.length
                    ? `${listings.length} MLS ${listings.length === 1 ? "listing sits" : "listings sit"} on a good lot${listingTop ? `, ${listingTop} on a top pick (starred)` : ""}.`
                    : listingsInfo
                      ? "No active listings sit on a good lot in this area."
                      : ""}
              </p>
              {shapeHint && <p className="mt-1 text-xs" style={{ color: "var(--slate)" }}>Zoom in to see each lot filled in.</p>}
              {error && <p role="alert" className="mt-3 text-xs" style={{ color: "var(--red)" }}>{error}</p>}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function LotPanel({ pin, lot, error, listing, onBack }: { pin: string | null; lot: Candidate | null; error: string | null; listing: MapListing | null; onBack: () => void }) {
  const canopy = lot ? pctOf(lot.canopyPct) : null;
  const steep = lot ? pctOf(lot.steepPct) : null;
  const sf = lot?.daduSqft ? Math.round(lot.daduSqft) : 0;
  const address = lot ? cleanAddress(lot.address) : "";
  return (
    <div className="p-5">
      <button type="button" className="pa-btn pa-btn-sm" onClick={onBack}>
        <ArrowLeft size={14} aria-hidden /> All lots
      </button>

      {error ? (
        <p role="alert" className="mt-5 text-sm" style={{ color: "var(--red)" }}>{error}</p>
      ) : !lot ? (
        <div className="mt-5 flex items-center gap-2 text-sm" style={{ color: "var(--slate)" }} role="status">
          <Loader2 size={14} className="animate-spin" aria-hidden /> Loading lot {pin}…
        </div>
      ) : (
        <>
          <h2 className="pa-display mt-5 text-2xl" style={{ color: "var(--ink)" }}>{address}</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>
            {lot.zoning}, {lot.lotSqft.toLocaleString()} sf lot{lot.zip ? `, ${lot.zip}` : ""}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-md px-2.5 py-1 text-xs font-semibold text-white" style={{ background: tierColor(lot.tier) }}>{tierLabel(lot.tier)}</span>
            {lot.corner && <span className="rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: "rgba(23,36,29,.08)", color: "var(--ink)" }}>Corner lot</span>}
            {lot.alley && <span className="rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: "rgba(46,92,110,.12)", color: "#2E5C6E" }}>Alley</span>}
            {listing && <span className="rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>For sale {usdShort(listing.price)}</span>}
          </div>

          <div className="pa-raised mt-5 flex items-center gap-4 p-4">
            <span
              className="pa-display flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl tabular-nums"
              style={{ background: "var(--card)", boxShadow: "var(--shadow-pop)", color: tierColor(lot.tier) }}
              aria-label={`Score ${lot.score} out of 100`}
            >
              {lot.score}
            </span>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--slate)" }}>Largest DADU</p>
              <p className="pa-display text-2xl tabular-nums" style={{ color: "var(--ink)" }}>{sf ? `${sf.toLocaleString()} sf` : "n/a"}</p>
              {sf > 0 && (
                <p className="mt-0.5 text-xs tabular-nums" style={{ color: "var(--slate)" }}>
                  {sf.toLocaleString()} sf × {usd(COST_PER_SF)} = <strong style={{ color: "var(--ink)" }}>{usd(constructionEstimate(sf))}</strong>
                  <br />{COST_LABEL}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Link href={`/feasibility?address=${encodeURIComponent(address + ", Seattle, WA")}`} className="pa-btn pa-btn-primary w-full no-underline">
              Open the full report <ArrowRight size={15} aria-hidden />
            </Link>
            <Link href={calculatorHref({ sf, address })} className="pa-btn w-full no-underline">
              <Calculator size={15} aria-hidden /> Estimate your return
            </Link>
          </div>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <Fact k="Lot type" v={lot.lotType ? titleCase(lot.lotType) : "n/a"} />
            <Fact k="Tree canopy" v={canopy != null ? `${canopy}%` : "n/a"} />
            <Fact k="Steep slope" v={steep ? `${steep}% of lot` : "None"} />
            <Fact k="ADUs nearby" v={String(lot.adusNearby)} />
          </dl>

        </>
      )}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`pa-chip ${on ? "pa-chip-active" : ""}`} style={{ minHeight: 36 }}>
      {children}
    </button>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt style={{ color: "var(--slate)" }}>{k}</dt>
      <dd className="text-right font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{v}</dd>
    </>
  );
}
