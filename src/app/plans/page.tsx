import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Heading, Lede, Section } from "@/components/ui";
import PlansBrowser from "@/components/plans/PlansBrowser";

export const metadata: Metadata = {
  title: "City-reviewed DADU plans — Pencil",
  description: "Pre-approved backyard cottage designs by Seattle architecture firms, already reviewed by the city. See which ones fit your lot.",
};

export default function PlansPage() {
  return (
    <main>
      <Section style={{ paddingBlock: "clamp(2rem, 5vw, 3.5rem) clamp(3rem, 6vw, 5rem)" }}>
        <Container>
          <Heading level={1} style={{ fontSize: "clamp(2.2rem, 4.6vw, 3.6rem)" }}>City-reviewed plans, ready to go</Heading>
          <Lede style={{ marginTop: 14 }}>Designed by Seattle architecture firms and already reviewed by the city. The shortest path to a permit.</Lede>
          <p className="pl-rule">Pre-approved plans are built as drawn. If you want changes, that becomes a custom plan.</p>
          <div style={{ marginTop: 24 }}>
            <Suspense>
              <PlansBrowser />
            </Suspense>
          </div>
        </Container>
      </Section>
    </main>
  );
}
