"use client";

import { Map, Marker } from "react-map-gl/maplibre";
import type { Parcel } from "@/lib/parcels";
import MapPin from "../MapPin";

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ??
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export default function ParcelMiniMap({ parcel }: { parcel: Parcel }) {
  return (
    <div className="h-56 w-full overflow-hidden rounded-[8px] border" style={{ borderColor: "var(--hairline)" }}>
      <Map
        initialViewState={{ longitude: parcel.lng, latitude: parcel.lat, zoom: 14 }}
        mapStyle={MAP_STYLE}
        attributionControl={{ compact: true }}
        dragRotate={false}
        style={{ width: "100%", height: "100%" }}
      >
        <Marker longitude={parcel.lng} latitude={parcel.lat}>
          <MapPin verdict={parcel.verdict} marginPct={parcel.marginPct} active />
        </Marker>
      </Map>
    </div>
  );
}
