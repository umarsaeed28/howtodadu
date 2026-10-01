"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Map, Source, Layer, Marker, NavigationControl, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import { ArrowLeft, ArrowRight, BedDouble, Calculator, FlaskConical, Loader2, Search, Star } from "lucide-react";
import type { Candidate } from "@/lib/server/candidates";
import type { MapListing } from "@/app/api/map-listings/route";
import { COST_LABEL, COST_PER_SF, constructionEstimate } from "@/lib/config/costs";
import { calculatorHref } from "@/lib/calculator/inputs";

const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE ?? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const SEATTLE = { longitude: -122.335, latitude: 47.62, zoom: 10.6 };
const PANEL_W = 392;
const PRICE_MAX = 3_000_000;
const PRICE_STEP = 50_000;

/** Every listing on the map can have a DADU. The grade says how good the lot is for one (site score 0 to 100). */
const DADU_COLOR = "#145A40";
export const TIERS = [
  { id: 3, label: "Top pick", note: "Scores 93 and up: alley or corner access, a layout that fits, a full-size DADU", color: "#145A40" },
  { id: 2, label: "Good", note: "Scores 82 to 92", color: "#6CB98A" },
  { id: 1, label: "Fair", note: "Scores 70 to 81: tight access, a narrow lot or a smaller DADU", color: "#D9A441" },
  { id: 0, label: "Marginal", note: "Scores under 70: a DADU fits, but the site is hard", color: "#B8B2A4" },
] as const;
const tierOf = (t: number) => TIERS.find((x) => x.id === t) ?? TIERS[3];

type SortKey = "score" | "dadu" | "price" | "beds" | "baths" | "sqft" | "ppsf" | "lot" | "dom" | "address";
interface Sort { key: SortKey; dir: "asc" | "desc" }
const SORT_PRESETS: { id: string; label: string; sort: Sort }[] = [
  { id: "score", label: "Best score", sort: { key: "score", dir: "desc" } },
  { id: "dadu", label: "Largest DADU", sort: { key: "dadu", dir: "desc" } },
  { id: "price-asc", label: "Price, low to high", sort: { key: "price", dir: "asc" } },
  { id: "price-desc", label: "Price, high to low", sort: { key: "price", dir: "desc" } },
];
const sortValue = (l: MapListing, k: SortKey): number | string =>
  k === "score" ? l.score : k === "dadu" ? l.daduSqft ?? -1 : k === "price" ? l.price : k === "beds" ? l.beds ?? -1 : k === "baths" ? l.baths ?? -1 : k === "sqft" ? l.sqft ?? -1
  : k === "ppsf" ? (l.sqft ? l.price / l.sqft : Infinity) : k === "lot" ? l.lotSqft : k === "dom" ? l.daysOnMarket ?? -1 : l.address;

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const cleanAddress = (a: string) => titleCase(a.replace(/,?\s*(seattle|wa)\b.*$/i, "").replace(/\s+\d{5}$/, ""));
const pctOf = (v: number | null) => (v == null ? null : Math.round(v <= 1 ? v * 100 : v));
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const usdShort = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 2).replace(/\.?0+$/, "")}M` : `$${Math.round(n / 1000)}K`);

/** Keep the map's focus clear of the docked panel: left on desktop, bottom on mobile. */
function viewPadding(detailOpen: boolean) {
  if (typeof window === "undefined") return { top: 40, bottom: 40, left: 40, right: 40 };
  if (window.innerWidth >= 768) return { top: 48, bottom: 48, left: PANEL_W + 32, right: 48 };
  return { top: 72, bottom: Math.round(window.innerHeight * (detailOpen ? 0.5 : 0.3)), left: 24, right: 24 };
}

export default function CandidateMap() {
  const mapRef = useRef<MapRef | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const initial = useRef(typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams());

  const [listings, setListings] = useState<MapListing[]>([]);
  const [loaded, setLoaded] = useState<{ key: string; connected: boolean; source: string | null } | null>(null);
  const [zipInput, setZipInput] = useState(initial.current.get("zip") ?? "");
  const [zipSel, setZipSel] = useState<string[]>(() => (initial.current.get("zip") ?? "").split(",").filter((z) => /^98\d{3}$/.test(z)));
  const [allZips, setAllZips] = useState<string[]>([]);
  const [shapes, setShapes] = useState<GeoJSON.FeatureCollection | null>(null);
  const [selectedPin, setSelectedPin] = useState<string | null>(() => initial.current.get("pin"));
  const [detail, setDetail] = useState<Candidate | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [topOnly, setTopOnly] = useState(false);
  const [cornerOnly, setCornerOnly] = useState(false);
  const [alleyOnly, setAlleyOnly] = useState(false);
  const [sort, setSort] = useState<Sort>({ key: "score", dir: "desc" });
  const [addr, setAddr] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchPin, setSearchPin] = useState<{ lng: number; lat: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fitted = useRef("");
  const pendingFly = useRef<{ lng: number; lat: number } | null>(null);
  const pendingFit = useRef<[[number, number], [number, number]] | null>(null);

  /* ---- listings with DADU potential, by ZIP or the whole city ---- */
  useEffect(() => {
    const ctl = new AbortController();
    const key = zipSel.join(",") || "all";
    fetch(`/api/map-listings${zipSel.length ? `?zip=${zipSel.join(",")}` : ""}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.listings ?? []) as MapListing[];
        setListings(rows);
        setLoaded({ key, connected: !!d.connected, source: d.source ?? null });
        if (!zipSel.length) setAllZips([...new Set(rows.map((l) => l.zip))].sort());
      })
      .catch((e) => {
        if (!(e instanceof DOMException && e.name === "AbortError")) setError("Could not load listings.");
      });
    return () => ctl.abort();
  }, [zipSel]);

  /* ---- outlines for the lots that have a listing (not the whole city) ---- */
  useEffect(() => {
    const pins = [...new Set(listings.map((l) => l.pin))];
    if (!pins.length) {
      setShapes(null);
      return;
    }
    const ctl = new AbortController();
    const chunks: string[][] = [];
    for (let i = 0; i < pins.length; i += 120) chunks.push(pins.slice(i, i + 120));
    Promise.all(chunks.map((c) => fetch(`/api/lot-shapes?pins=${c.join(",")}`, { signal: ctl.signal }).then((r) => (r.ok ? r.json() : { features: [] }))))
      .then((parts) => setShapes({ type: "FeatureCollection", features: parts.flatMap((p) => (p.features ?? []) as GeoJSON.Feature[]) }))
      .catch(() => {
        /* the price pins still mark every listing */
      });
    return () => ctl.abort();
  }, [listings]);

  /* ---- keep the address bar in step so any view can be shared ---- */
  useEffect(() => {
    const q = new URLSearchParams();
    if (zipSel.length) q.set("zip", zipSel.join(","));
    if (selectedPin) q.set("pin", selectedPin);
    const next = `${window.location.pathname}${q.toString() ? `?${q}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next);
  }, [zipSel, selectedPin]);

  /* ---- what is on the map right now ---- */
  const shown = useMemo(() => {
    const rows = listings.filter((l) => l.price <= maxPrice && (!topOnly || l.tier === 3) && (!cornerOnly || l.corner) && (!alleyOnly || l.alley));
    const m = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = sortValue(a, sort.key), y = sortValue(b, sort.key);
      const c = typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number);
      return c * m || a.price - b.price;
    });
  }, [listings, maxPrice, topOnly, cornerOnly, alleyOnly, sort]);

  const byPin = useMemo(() => new globalThis.Map(shown.map((l) => [l.pin, l])), [shown]);
  const shapesColored = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!shapes) return null;
    return {
      type: "FeatureCollection",
      features: shapes.features
        .filter((f) => byPin.has(String(f.properties?.pin)))
        .map((f) => {
          const l = byPin.get(String(f.properties?.pin))!;
          return { ...f, properties: { pin: l.pin, tier: l.tier, corner: l.corner, alley: l.alley } };
        }),
    };
  }, [shapes, byPin]);

  /* ---- on open, and when the ZIPs change, frame the listings ---- */
  const applyFit = useCallback((b: [[number, number], [number, number]]) => {
    const map = mapRef.current?.getMap();
    if (!map) {
      pendingFit.current = b; // the map is still loading: fit once it is ready
      return;
    }
    map.fitBounds(b, { padding: viewPadding(false), duration: 0, maxZoom: 15.5 });
  }, []);
  useEffect(() => {
    if (!loaded || fitted.current === loaded.key) return;
    if (selectedPin && loaded.key === "all") {
      fitted.current = loaded.key; // a deep-linked lot sets the view
      return;
    }
    if (!listings.length) return;
    fitted.current = loaded.key;
    let w = 180, so = 90, e = -180, n = -90;
    for (const l of listings) {
      w = Math.min(w, l.lng); e = Math.max(e, l.lng); so = Math.min(so, l.lat); n = Math.max(n, l.lat);
    }
    if (w === e && so === n) { w -= 0.004; e += 0.004; so -= 0.003; n += 0.003; }
    applyFit([[w, so], [e, n]]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, loaded]);

  /* ---- selecting a lot: ease the map so it stays clear of the docked panel ---- */
  const flyToLot = useCallback((lng: number, lat: number) => {
    const map = mapRef.current?.getMap();
    if (!map) {
      pendingFly.current = { lng, lat };
      return;
    }
    map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16.6), padding: viewPadding(true), duration: 650 });
  }, []);
  const selectPin = useCallback(
    (pin: string | null) => {
      setSelectedPin(pin);
      setDetailError(null);
      const l = pin ? listings.find((x) => x.pin === pin) : null;
      if (l) flyToLot(l.lng, l.lat);
    },
    [listings, flyToLot]
  );

  /* ---- lot detail (also serves ?pin= deep links) ---- */
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
        if (!listings.some((l) => l.pin === d.pin)) flyToLot(d.lng, d.lat);
      })
      .catch((e) => {
        if (!(e instanceof DOMException && e.name === "AbortError")) setDetailError(e instanceof Error ? e.message : "Could not load that lot.");
      });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPin]);

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
    if (process.env.NEXT_PUBLIC_E2E === "1") (window as unknown as { __pencil?: unknown }).__pencil = { selectPin, getMap: () => mapRef.current?.getMap(), listingCount: listings.length };
  });

  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (f) selectPin(String(f.properties?.pin));
  }, [selectPin]);

  function applyZips(raw: string) {
    const tokens = raw.split(/[\s,]+/).filter(Boolean);
    const valid = tokens.filter((t) => allZips.length === 0 || allZips.includes(t));
    setZipSel(valid);
    setError(tokens.length && !valid.length ? "No listings in that ZIP code. Pick one from the list." : null);
  }

  async function findAddress(e: React.FormEvent) {
    e.preventDefault();
    const q = addr.trim();
    if (q.length < 3) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const hit = ((await res.json()) as { lat: number; lng: number }[])[0];
      if (!hit) {
        setError("No Seattle address matched that search.");
        return;
      }
      setError(null);
      setSearchPin({ lng: hit.lng, lat: hit.lat });
      const near = shown.find((l) => Math.abs(l.lat - hit.lat) < 0.0003 && Math.abs(l.lng - hit.lng) < 0.0004);
      if (near) selectPin(near.pin);
      else {
        if (selectedPin) setSelectedPin(null);
        fitted.current = loaded?.key ?? fitted.current; // the search owns the view now
        mapRef.current?.getMap().easeTo({ center: [hit.lng, hit.lat], zoom: 17, padding: viewPadding(false), duration: 900 });
      }
    } catch {
      setError("Address search is unavailable right now.");
    } finally {
      setSearching(false);
    }
  }

  const fill = ["match", ["get", "tier"], 3, TIERS[0].color, 2, TIERS[1].color, 1, TIERS[2].color, TIERS[3].color] as unknown as string;
  const ring = ["case", ["==", ["get", "corner"], true], "#17241D", ["==", ["get", "alley"], true], "#2E5C6E", "#ffffff"] as unknown as string;
  const detailOpen = selectedPin !== null;
  const isTest = loaded?.source === "fixture";
  const selectedListing = selectedPin ? listings.find((l) => l.pin === selectedPin) ?? null : null;

  return (
    <div className="relative h-[calc(100dvh_-_var(--nav-h))] w-full overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={SEATTLE}
        mapStyle={MAP_STYLE}
        onLoad={() => {
          if (pendingFit.current && !pendingFly.current) {
            const b = pendingFit.current;
            pendingFit.current = null;
            applyFit(b);
          }
          const p = pendingFly.current;
          if (p) {
            pendingFly.current = null;
            mapRef.current?.getMap().jumpTo({ center: [p.lng, p.lat], zoom: 16.6, padding: viewPadding(true) });
          }
        }}
        onClick={onClick}
        interactiveLayerIds={["lot-fill"]}
        attributionControl={{ compact: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {shapesColored && (
          <Source id="lot-shapes" type="geojson" data={shapesColored}>
            <Layer id="lot-fill" type="fill" paint={{ "fill-color": fill, "fill-opacity": 0.5 }} />
            <Layer id="lot-outline" type="line" paint={{ "line-color": ring, "line-width": ["case", ["==", ["get", "pin"], selectedPin ?? ""], 3.5, 1.5] }} />
          </Source>
        )}

        {searchPin && (
          <Marker longitude={searchPin.lng} latitude={searchPin.lat} anchor="center">
            <span aria-label="Searched address" className="block h-4 w-4 rounded-full" style={{ background: "#2E5C6E", border: "3px solid #fff", boxShadow: "0 0 0 2px #2E5C6E, 0 2px 8px rgba(23,36,29,.4)" }} />
          </Marker>
        )}

        {shown.map((l) => {
          const t = tierOf(l.tier);
          const on = l.pin === selectedPin;
          return (
            <Marker key={l.mlsId} longitude={l.lng} latitude={l.lat} anchor="bottom" style={{ zIndex: on ? 5 : 1 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  selectPin(l.pin);
                }}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-white"
                style={{ background: t.color, boxShadow: on ? "0 0 0 3px #17241D, 0 4px 12px rgba(23,36,29,.4)" : "0 2px 8px rgba(23,36,29,.3)", border: "1.5px solid #fff", transform: on ? "scale(1.12)" : undefined, transition: "transform .15s cubic-bezier(.16,1,.3,1)" }}
                aria-label={`${t.label} listing at ${cleanAddress(l.address)}, ${usdShort(l.price)}, score ${l.score}`}
              >
                {l.tier === 3 && <Star size={11} aria-hidden fill="#fff" />}
                {usdShort(l.price)}
              </button>
            </Marker>
          );
        })}
      </Map>

      {/* Docked panel: left column on desktop, bottom sheet on mobile */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        aria-label={detailOpen ? "Listing details" : "Listings"}
        className="absolute inset-x-0 bottom-0 z-10 flex max-h-[56vh] flex-col overflow-hidden rounded-t-[18px] outline-none md:inset-y-0 md:left-0 md:right-auto md:max-h-none md:rounded-none"
        style={{ background: "var(--bg)", boxShadow: "0 -8px 28px -10px rgba(23,36,29,.28)" }}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full md:hidden" style={{ background: "var(--line-strong)" }} aria-hidden />
        <div className="min-h-0 flex-1 overflow-y-auto md:w-[392px]">
          {detailOpen ? (
            <LotPanel pin={selectedPin} lot={detail} error={detailError} listing={selectedListing} onBack={() => selectPin(null)} />
          ) : (
            <div className="flex flex-col">
              <div className="p-5 pb-3">
                <h1 className="pa-display text-xl" style={{ color: "var(--ink)" }}>Properties that can have a DADU</h1>
                <p className="mt-1 text-sm" style={{ color: "var(--slate)" }} aria-live="polite">
                  {!loaded ? "Loading listings…" : loaded.connected ? `${shown.length.toLocaleString()} for-sale ${shown.length === 1 ? "property" : "properties"} that can have a DADU${zipSel.length ? ` in ${zipSel.join(", ")}` : " across Seattle"}, ${shown.filter((l) => l.tier === 3).length} top picks` : "No listings feed is connected yet."}
                </p>
                {isTest && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>
                    <FlaskConical size={14} className="mt-px shrink-0" aria-hidden />
                    <span><strong>Sample data.</strong> These are test listings, not live. Live Redfin listings replace them once the feed is connected.</span>
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <label htmlFor="zip-input" className="sr-only">ZIP codes</label>
                  <input id="zip-input" list="zip-list" value={zipInput} onChange={(e) => setZipInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyZips(zipInput)} onBlur={() => applyZips(zipInput)} placeholder="ZIP codes, like 98105" className="min-w-0 flex-1 px-3 py-2 text-sm" inputMode="numeric" autoComplete="off" />
                  <button type="button" className="pa-btn pa-btn-sm" onClick={() => { setZipInput(""); setZipSel([]); setError(null); }} disabled={!zipSel.length}>All</button>
                </div>
                <datalist id="zip-list">{allZips.map((z) => <option key={z} value={z} />)}</datalist>

                <form onSubmit={findAddress} className="mt-2">
                  <label htmlFor="addr-input" className="sr-only">Find an address</label>
                  <div className="pa-inset flex items-center gap-2 px-3" style={{ minHeight: 42 }}>
                    <Search size={15} aria-hidden style={{ color: "var(--slate)" }} />
                    <input id="addr-input" type="text" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Find an address" className="w-full bg-transparent py-2 text-sm outline-none" autoComplete="off" />
                    {searching && <Loader2 size={14} className="animate-spin" aria-hidden />}
                  </div>
                </form>

                <div className="mt-4">
                  <label htmlFor="price-max" className="flex items-baseline justify-between text-xs font-semibold" style={{ color: "var(--ink)" }}>
                    <span>Price</span>
                    <span className="tabular-nums">{maxPrice >= PRICE_MAX ? "$0 to $3M" : `$0 to ${usdShort(maxPrice)}`}</span>
                  </label>
                  <input id="price-max" type="range" min={0} max={PRICE_MAX} step={PRICE_STEP} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="mt-2 w-full" aria-valuetext={maxPrice >= PRICE_MAX ? "No maximum, up to $3M" : `Up to ${usd(maxPrice)}`} />
                  <div className="flex justify-between text-[11px]" style={{ color: "var(--slate)" }} aria-hidden><span>$0</span><span>$3M</span></div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter listings">
                  <Chip on={topOnly} onClick={() => setTopOnly((v) => !v)}>Top picks</Chip>
                  <Chip on={cornerOnly} onClick={() => setCornerOnly((v) => !v)}>Corner lot</Chip>
                  <Chip on={alleyOnly} onClick={() => setAlleyOnly((v) => !v)}>Alley access</Chip>
                </div>
                {error && <p role="alert" className="mt-3 text-xs" style={{ color: "var(--red)" }}>{error}</p>}
              </div>

              <div className="flex items-center justify-between gap-3 border-t px-5 py-2.5" style={{ borderColor: "var(--hairline)" }}>
                <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: "var(--slate)" }} aria-label="Grade key">
                  {TIERS.map((t) => (
                    <li key={t.id} className="flex items-center gap-1.5" title={t.note}><span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: t.color }} />{t.label}</li>
                  ))}
                </ul>
                <label className="flex shrink-0 items-center gap-1.5 text-xs" style={{ color: "var(--slate)" }}>
                  <span className="sr-only">Sort listings</span>
                  <select value={SORT_PRESETS.find((p) => p.sort.key === sort.key && p.sort.dir === sort.dir)?.id ?? ""} onChange={(e) => { const p = SORT_PRESETS.find((x) => x.id === e.target.value); if (p) setSort(p.sort); }} className="rounded-md bg-transparent py-1 pr-1 text-xs font-semibold" style={{ color: "var(--ink)" }}>
                    {!SORT_PRESETS.some((p) => p.sort.key === sort.key && p.sort.dir === sort.dir) && <option value="">Sorted by table</option>}
                    {SORT_PRESETS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </label>
              </div>

              <ul className="flex flex-col">
                {shown.map((l) => <ListingRow key={l.mlsId} l={l} onSelect={() => selectPin(l.pin)} />)}
                {loaded && loaded.connected && !shown.length && (
                  <li className="px-5 py-8 text-sm" style={{ color: "var(--slate)" }}>No listings match. Raise the price limit or clear a filter.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function ListingRow({ l, onSelect }: { l: MapListing; onSelect: () => void }) {
  const t = tierOf(l.tier);
  return (
    <li className="border-t" style={{ borderColor: "var(--hairline)" }}>
      <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[var(--green-tint)]" aria-label={`${cleanAddress(l.address)}, ${usd(l.price)}, ${t.label}, score ${l.score}${l.daduSqft ? `, DADU up to ${Math.round(l.daduSqft)} square feet` : ""}`}>
        <span className="pa-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base tabular-nums text-white" style={{ background: t.color }} aria-hidden>{l.score}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="pa-display text-base tabular-nums" style={{ color: "var(--ink)" }}>{usd(l.price)}</span>
            {l.daduSqft ? <span className="rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums" style={{ background: "var(--green-tint)", color: DADU_COLOR }}>DADU up to {Math.round(l.daduSqft).toLocaleString()} sf</span> : null}
          </span>
          <span className="block truncate text-sm" style={{ color: "var(--ink)" }}>{cleanAddress(l.address)}</span>
          <span className="mt-0.5 flex items-center gap-2 text-xs tabular-nums" style={{ color: "var(--slate)" }}>
            {l.beds != null && <span className="flex items-center gap-1"><BedDouble size={12} aria-hidden />{l.beds} bd</span>}
            {l.baths != null && <span>{l.baths} ba</span>}
            {l.sqft != null && <span>{l.sqft.toLocaleString()} sf</span>}
            {l.corner && <span>Corner</span>}
            {l.alley && <span>Alley</span>}
          </span>
        </span>
      </button>
    </li>
  );
}

function LotPanel({ pin, lot, error, listing, onBack }: { pin: string | null; lot: Candidate | null; error: string | null; listing: MapListing | null; onBack: () => void }) {
  const canopy = lot ? pctOf(lot.canopyPct) : null;
  const steep = lot ? pctOf(lot.steepPct) : null;
  const sf = lot?.daduSqft ? Math.round(lot.daduSqft) : 0;
  const address = lot ? cleanAddress(lot.address) : listing ? cleanAddress(listing.address) : "";
  const t = lot ? tierOf(lot.tier) : null;
  return (
    <div className="p-5">
      <button type="button" className="pa-btn pa-btn-sm" onClick={onBack}>
        <ArrowLeft size={14} aria-hidden /> All listings
      </button>

      {error ? (
        <p role="alert" className="mt-5 text-sm" style={{ color: "var(--red)" }}>{error}</p>
      ) : !lot || !t ? (
        <div className="mt-5 flex items-center gap-2 text-sm" style={{ color: "var(--slate)" }} role="status">
          <Loader2 size={14} className="animate-spin" aria-hidden /> Loading lot {pin}…
        </div>
      ) : (
        <>
          {listing && <p className="pa-display mt-5 text-3xl tabular-nums" style={{ color: "var(--ink)" }}>{usd(listing.price)}</p>}
          <h2 className={`pa-display ${listing ? "mt-1 text-lg" : "mt-5 text-2xl"}`} style={{ color: listing ? "var(--slate)" : "var(--ink)" }}>{address}</h2>
          {listing && (
            <p className="mt-1 flex flex-wrap gap-x-3 text-sm tabular-nums" style={{ color: "var(--ink)" }}>
              {listing.beds != null && <span><strong>{listing.beds}</strong> bd</span>}
              {listing.baths != null && <span><strong>{listing.baths}</strong> ba</span>}
              {listing.sqft != null && <span><strong>{listing.sqft.toLocaleString()}</strong> sf</span>}
              <span><strong>{lot.lotSqft.toLocaleString()}</strong> sf lot</span>
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-md px-2.5 py-1 text-xs font-semibold text-white" style={{ background: t.color }}>{t.label}</span>
            {lot.corner && <span className="rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: "rgba(23,36,29,.08)", color: "var(--ink)" }}>Corner lot</span>}
            {lot.alley && <span className="rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: "rgba(46,92,110,.12)", color: "#2E5C6E" }}>Alley</span>}
            {listing?.test && <span className="rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>Sample data</span>}
          </div>

          <div className="pa-raised mt-5 flex items-center gap-4 p-4">
            <span className="pa-display flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl tabular-nums" style={{ background: "var(--card)", boxShadow: "var(--shadow-pop)", color: t.color }} aria-label={`Score ${lot.score} out of 100`}>{lot.score}</span>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--slate)" }}>Largest DADU</p>
              <p className="pa-display text-2xl tabular-nums" style={{ color: "var(--ink)" }}>{sf ? `${sf.toLocaleString()} sf` : "n/a"}</p>
              {sf > 0 && (
                <p className="mt-0.5 text-xs tabular-nums" style={{ color: "var(--slate)" }}>
                  About <strong style={{ color: "var(--ink)" }}>{usd(constructionEstimate(sf))}</strong> to build at {usd(COST_PER_SF)} per sf. {COST_LABEL}.
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            {listing && (
              <Link href={`/listing/${encodeURIComponent(listing.mlsId)}`} className="pa-btn pa-btn-primary w-full no-underline">
                View the listing <ArrowRight size={15} aria-hidden />
              </Link>
            )}
            <Link href={`/feasibility?address=${encodeURIComponent(address + ", Seattle, WA")}`} className="pa-btn w-full no-underline">Open the full report</Link>
            <Link href={calculatorHref({ sf, address })} className="pa-btn w-full no-underline"><Calculator size={15} aria-hidden /> Estimate your return</Link>
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
