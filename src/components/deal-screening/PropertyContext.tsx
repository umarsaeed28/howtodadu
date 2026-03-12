import type { LotGeometry } from "@/lib/feasibility";

interface PropertyContextProps {
  lot: LotGeometry | null;
  address: string;
}

export function PropertyContext({ lot, address }: PropertyContextProps) {
  return (
    <section
      className="border border-border rounded-lg overflow-hidden bg-background"
      aria-labelledby="property-context-heading"
    >
      <h2
        id="property-context-heading"
        className="text-lg font-medium text-foreground p-6 pb-0"
      >
        Property context
      </h2>
      <div className="p-6">
        {lot ? (
          <div className="relative rounded-md overflow-hidden bg-muted/20 aspect-square max-h-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lot.aerialUrl}
              alt={`Aerial view of parcel at ${address}`}
              className="w-full h-full object-cover"
            />
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${lot.imageSize} ${lot.imageSize}`}
              preserveAspectRatio="xMidYMid meet"
              aria-hidden
            >
              <path
                d={
                  lot.rings
                    .map(([lng, lat], j) => {
                      const [xmin, ymin, xmax, ymax] = lot.bbox;
                      const x =
                        ((lng - xmin) / (xmax - xmin)) * lot.imageSize;
                      const y =
                        (1 - (lat - ymin) / (ymax - ymin)) * lot.imageSize;
                      return `${j === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
                    })
                    .join(" ") + " Z"
                }
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                className="text-primary/80"
              />
            </svg>
          </div>
        ) : (
          <div
            className="aspect-square max-h-80 rounded-md bg-muted/30 flex items-center justify-center text-muted-foreground text-sm"
            role="img"
            aria-label="Aerial imagery not available"
          >
            Aerial imagery not available
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Parcel outline overlay. Imagery from Seattle GIS.
        </p>
      </div>
    </section>
  );
}
