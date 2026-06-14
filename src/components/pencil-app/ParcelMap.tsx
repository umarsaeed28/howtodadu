"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import {
  Map,
  Marker,
  Popup,
  Source,
  Layer,
  NavigationControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import Supercluster from "supercluster";
import { Pencil, Check, Search as SearchIcon, Trash2 } from "lucide-react";
import type { Parcel } from "@/lib/parcels";
import { getParcel } from "@/lib/parcels";
import { useAppStore } from "@/lib/store";
import MapPin from "./MapPin";
import MapPopover from "./MapPopover";

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ??
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const INITIAL = { longitude: -122.34, latitude: 47.63, zoom: 10.4 };

type Bounds = [number, number, number, number];

interface ParcelMapProps {
  parcels: Parcel[];
  onBoundsChange?: (b: Bounds) => void;
  onUserMove?: () => void;
  showSearchHere?: boolean;
  onSearchHere?: () => void;
}

export default function ParcelMap({
  parcels,
  onBoundsChange,
  onUserMove,
  showSearchHere,
  onSearchHere,
}: ParcelMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [zoom, setZoom] = useState(INITIAL.zoom);
  const [draft, setDraft] = useState<[number, number][]>([]);

  const hoveredId = useAppStore((s) => s.hoveredId);
  const selectedId = useAppStore((s) => s.selectedId);
  const setHovered = useAppStore((s) => s.setHovered);
  const setSelected = useAppStore((s) => s.setSelected);
  const pencilsOnly = useAppStore((s) => s.filters.pencilsOnly);
  const setFilter = useAppStore((s) => s.setFilter);
  const drawing = useAppStore((s) => s.drawing);
  const setDrawing = useAppStore((s) => s.setDrawing);
  const drawPolygon = useAppStore((s) => s.drawPolygon);
  const setDrawPolygon = useAppStore((s) => s.setDrawPolygon);

  const index = useMemo(() => {
    const sc = new Supercluster<{ parcelId: string }>({ radius: 56, maxZoom: 14 });
    sc.load(
      parcels.map((p) => ({
        type: "Feature" as const,
        properties: { parcelId: p.id },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      }))
    );
    return sc;
  }, [parcels]);

  const clusters = useMemo(() => {
    if (!bounds) {
      return parcels.map((p) => ({
        type: "Feature" as const,
        properties: { parcelId: p.id, cluster: false },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      }));
    }
    return index.getClusters(bounds, Math.round(zoom));
  }, [index, bounds, zoom, parcels]);

  const syncBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds().toArray();
    const next: Bounds = [b[0][0], b[0][1], b[1][0], b[1][1]];
    setBounds(next);
    setZoom(map.getZoom());
    onBoundsChange?.(next);
  }, [onBoundsChange]);

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (drawing) {
        setDraft((d) => [...d, [e.lngLat.lng, e.lngLat.lat]]);
        return;
      }
      setSelected(null);
    },
    [drawing, setSelected]
  );

  const finishDraw = useCallback(() => {
    if (draft.length >= 3) setDrawPolygon([...draft, draft[0]]);
    setDraft([]);
  }, [draft, setDrawPolygon]);

  const clearDraw = useCallback(() => {
    setDraft([]);
    setDrawPolygon(null);
    setDrawing(false);
  }, [setDrawPolygon, setDrawing]);

  const selected = selectedId ? getParcel(selectedId) : undefined;

  const polygonGeo = useMemo(() => {
    const ring = draft.length
      ? draft
      : drawPolygon
        ? drawPolygon
        : null;
    if (!ring || ring.length < 2) return null;
    const closed = draft.length ? [...ring] : ring;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: closed },
    };
  }, [draft, drawPolygon]);

  const fillGeo = useMemo(() => {
    const ring = drawPolygon;
    if (!ring || ring.length < 4) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "Polygon" as const, coordinates: [ring] },
    };
  }, [drawPolygon]);

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={INITIAL}
        mapStyle={MAP_STYLE}
        onLoad={syncBounds}
        onMoveEnd={syncBounds}
        onDragStart={() => onUserMove?.()}
        onZoomStart={(e) => {
          if (e.originalEvent) onUserMove?.();
        }}
        onClick={handleMapClick}
        cursor={drawing ? "crosshair" : "grab"}
        attributionControl={{ compact: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {fillGeo && (
          <Source id="pa-draw-fill" type="geojson" data={fillGeo}>
            <Layer
              id="pa-draw-fill-layer"
              type="fill"
              paint={{ "fill-color": "#1E6B45", "fill-opacity": 0.08 }}
            />
          </Source>
        )}
        {polygonGeo && (
          <Source id="pa-draw-line" type="geojson" data={polygonGeo}>
            <Layer
              id="pa-draw-line-layer"
              type="line"
              paint={{
                "line-color": "#1E6B45",
                "line-width": 2,
                "line-dasharray": [2, 1],
              }}
            />
          </Source>
        )}

        {clusters.map((c) => {
          const [lng, lat] = c.geometry.coordinates as [number, number];
          const props = c.properties as {
            cluster?: boolean;
            point_count?: number;
            parcelId?: string;
            cluster_id?: number;
          };

          if (props.cluster) {
            const count = props.point_count ?? 0;
            const size = 30 + Math.min(count, 8) * 4;
            return (
              <Marker key={`cluster-${props.cluster_id}`} longitude={lng} latitude={lat}>
                <button
                  type="button"
                  className="pa-cluster"
                  style={{ width: size, height: size, fontSize: size > 40 ? 14 : 12 }}
                  aria-label={`${count} parcels — zoom in`}
                  onClick={() => {
                    const expansion = Math.min(
                      index.getClusterExpansionZoom(props.cluster_id as number),
                      16
                    );
                    mapRef.current?.easeTo({ center: [lng, lat], zoom: expansion });
                  }}
                >
                  {count}
                </button>
              </Marker>
            );
          }

          const parcel = getParcel(props.parcelId as string);
          if (!parcel) return null;
          return (
            <Marker
              key={parcel.id}
              longitude={lng}
              latitude={lat}
              style={{
                zIndex: hoveredId === parcel.id || selectedId === parcel.id ? 5 : 1,
              }}
            >
              <MapPin
                verdict={parcel.verdict}
                marginPct={parcel.marginPct}
                active={hoveredId === parcel.id || selectedId === parcel.id}
                onEnter={() => setHovered(parcel.id)}
                onLeave={() => setHovered(null)}
                onClick={() => setSelected(parcel.id)}
              />
            </Marker>
          );
        })}

        {selected && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="bottom"
            offset={18}
            closeButton={false}
            closeOnClick={false}
            maxWidth="260px"
            className="pa-popup"
            onClose={() => setSelected(null)}
          >
            <MapPopover parcel={selected} onClose={() => setSelected(null)} />
          </Popup>
        )}
      </Map>

      {/* Search this area */}
      {showSearchHere && !drawing && (
        <button
          type="button"
          onClick={onSearchHere}
          className="pa-btn absolute left-1/2 top-3 z-10 -translate-x-1/2 shadow"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          <SearchIcon size={15} aria-hidden /> Search this area
        </button>
      )}

      {/* Left floating controls */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
        <button
          type="button"
          className="pa-btn pa-btn-sm"
          aria-pressed={drawing}
          onClick={() => {
            if (drawing) {
              finishDraw();
            } else {
              setDrawPolygon(null);
              setDraft([]);
              setDrawing(true);
            }
          }}
          style={
            drawing
              ? { background: "var(--green)", color: "#fff", borderColor: "var(--green)" }
              : { background: "var(--card)" }
          }
        >
          <Pencil size={14} aria-hidden /> {drawing ? "Finish area" : "Draw"}
        </button>
        {(drawPolygon || draft.length > 0) && (
          <button
            type="button"
            className="pa-btn pa-btn-sm"
            onClick={clearDraw}
            style={{ background: "var(--card)" }}
          >
            <Trash2 size={14} aria-hidden /> Clear
          </button>
        )}
        <button
          type="button"
          className={`pa-chip ${pencilsOnly ? "pa-chip-active" : ""}`}
          aria-pressed={pencilsOnly}
          onClick={() => setFilter("pencilsOnly", !pencilsOnly)}
          style={{ minHeight: 36 }}
        >
          {pencilsOnly ? <Check size={13} aria-hidden /> : null}
          Pencils only
        </button>
      </div>

      {drawing && (
        <div
          className="pa-card absolute bottom-3 left-1/2 z-10 -translate-x-1/2 px-3 py-1.5 text-xs"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          Click the map to outline an area · {draft.length} point
          {draft.length === 1 ? "" : "s"} · then “Finish area”
        </div>
      )}
    </div>
  );
}
