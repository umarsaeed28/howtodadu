import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Heading, Lede, Section } from "@/components/ui";
import CustomStudio from "@/components/custom/CustomStudio";

export const metadata: Metadata = {
  title: "Draw your own DADU — Pencil",
  description: "Sketch your backyard cottage on your Seattle lot. We check it against code as you draw, draft a layout, and our architects finish the plan.",
};

export default function CustomPage() {
  return (
    <main>
      <Section style={{ paddingBlock: "clamp(2rem, 5vw, 3.5rem) clamp(3rem, 6vw, 5rem)" }}>
        <Container style={{ maxWidth: 1180 }}>
          <Heading level={1} style={{ fontSize: "clamp(2.2rem, 4.6vw, 3.6rem)" }}>Draw it. We&apos;ll make it real.</Heading>
          <Lede style={{ marginTop: 14 }}>Sketch your DADU on your lot. We check it against code as you draw.</Lede>
          <div style={{ marginTop: 24 }}>
            <Suspense>
              <CustomStudio />
            </Suspense>
          </div>
        </Container>
      </Section>
    </main>
  );
}
