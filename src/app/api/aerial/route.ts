import { NextRequest, NextResponse } from "next/server";

const BASEMAPS: Record<string, string> = {
  topo: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/export",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export",
  street: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export",
};

export async function GET(request: NextRequest) {
  const bbox = request.nextUrl.searchParams.get("bbox");
  const size = request.nextUrl.searchParams.get("size") || "800,800";
  const style = request.nextUrl.searchParams.get("style") || "topo";

  if (!bbox) {
    return NextResponse.json(
      { error: "bbox parameter is required" },
      { status: 400 }
    );
  }

  const url = BASEMAPS[style] || BASEMAPS.topo;

  const params = new URLSearchParams({
    bbox,
    bboxSR: "4326",
    size,
    format: "png",
    f: "image",
  });

  const res = await fetch(`${url}?${params}`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok || !res.headers.get("content-type")?.includes("image")) {
    return NextResponse.json(
      { error: "Failed to fetch map imagery" },
      { status: 502 }
    );
  }

  const buffer = await res.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
