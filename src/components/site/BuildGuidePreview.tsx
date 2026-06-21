import { Section, Container, Heading, Body, Button } from "@/components/ui";
import { ArrowRight } from "lucide-react";

const PREVIEW = {
  type: "4 townhomes",
  zone: "NR2 · Seattle",
  units: "4 homes",
  summary:
    "Row of attached homes on a 5,000 sq ft lot. Each unit gets its own entry and roughly 1,400 sq ft of finished space.",
  steps: [
    "Confirm HB 1110 unit count and rear-yard access for construction.",
    "Lay out four attached units with shared party walls.",
    "Permit as middle housing under Seattle residential code.",
    "Build, inspect, and close out certificates of occupancy.",
  ],
  constraints: ["Side-yard access for fire separation", "Tree retention review likely", "Alley access for staging"],
};

export default function BuildGuidePreview() {
  return (
    <Section soft>
      <Container>
        <Heading level={2} style={{ maxWidth: "22ch" }}>
          A complete guide for every build option.
        </Heading>
        <Body style={{ marginTop: 14, maxWidth: "40rem" }}>
          After you check a property, Pencil opens a full guide for each realistic way to build it:
          what it is, why it fits the lot, constraints to verify, and the steps to get there.
        </Body>

        <div
          className="mt-10 overflow-hidden rounded-[14px] border"
          style={{ borderColor: "var(--line)", background: "var(--card)" }}
        >
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"
            style={{ borderColor: "var(--line)", background: "var(--bg-soft)" }}
          >
            <div>
              <p className="s-mono text-xs" style={{ color: "var(--green)" }}>
                Build guide preview
              </p>
              <p className="s-h3" style={{ marginTop: 6 }}>
                {PREVIEW.type}
              </p>
              <p className="s-body" style={{ marginTop: 4, fontSize: "0.92rem" }}>
                {PREVIEW.zone} · {PREVIEW.units}
              </p>
            </div>
            <Button href="/feasibility" variant="outline">
              Check your property
              <ArrowRight size={15} aria-hidden />
            </Button>
          </div>

          <div className="grid gap-6 p-5 md:grid-cols-2">
            <div>
              <p className="s-mono text-xs" style={{ color: "var(--slate)" }}>
                What it is
              </p>
              <p className="s-body" style={{ marginTop: 8, fontSize: "0.95rem" }}>
                {PREVIEW.summary}
              </p>
            </div>
            <div>
              <p className="s-mono text-xs" style={{ color: "var(--slate)" }}>
                Constraints to verify
              </p>
              <ul className="s-body mt-2 space-y-1.5 pl-4 text-sm" style={{ listStyle: "disc" }}>
                {PREVIEW.constraints.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-2">
              <p className="s-mono text-xs" style={{ color: "var(--slate)" }}>
                Steps to build
              </p>
              <ol className="s-body mt-2 space-y-1.5 pl-4 text-sm" style={{ listStyle: "decimal" }}>
                {PREVIEW.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
