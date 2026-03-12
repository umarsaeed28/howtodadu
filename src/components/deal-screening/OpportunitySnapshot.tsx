import type { SiteOverview } from "@/lib/deal-scoring";

interface OpportunitySnapshotProps {
  overview: SiteOverview;
}

export function OpportunitySnapshot({ overview }: OpportunitySnapshotProps) {
  const cards = [
    { label: "Likely development type", value: overview.likelyDevelopmentType },
    { label: "Lot size", value: `${overview.lotSizeSqft.toLocaleString()} sq ft` },
    { label: "Terrain rating", value: overview.terrainRating },
    { label: "Backyard buildability", value: overview.backyardRating },
    { label: "Access", value: overview.accessSignal },
  ];

  return (
    <section
      className="border border-border rounded-lg p-6 bg-background"
      aria-labelledby="opportunity-snapshot-heading"
    >
      <h2
        id="opportunity-snapshot-heading"
        className="text-lg font-medium text-foreground mb-6"
      >
        Opportunity snapshot
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="border border-border rounded-md p-4 bg-muted/30"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              {card.label}
            </p>
            <p className="text-base font-medium text-foreground">{card.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
