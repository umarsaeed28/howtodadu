import type { Metadata } from "next";
import { Mail, Sparkles } from "lucide-react";
import { Section, Container, Eyebrow, Heading, Lede, Button } from "@/components/ui";
import ContactForm from "@/components/site/ContactForm";

export const metadata: Metadata = {
  title: "Talk to us — Pencil",
  description:
    "Tell us about a property or project. We will walk through what it allows and the realistic build paths.",
};

export default function ContactPage() {
  return (
    <main>
      <Section>
        <Container>
          <div className="s-grid s-grid-2" style={{ gap: "clamp(2rem,5vw,4rem)", alignItems: "start" }}>
            <div>
              <Eyebrow>Talk to us</Eyebrow>
              <Heading level={1} style={{ marginTop: 18 }}>
                Planning a project?
              </Heading>
              <Lede style={{ marginTop: 22, maxWidth: "34rem" }}>
                Tell us about the property. We will walk through what it allows, the build options, and
                what to verify before you commit.
              </Lede>
              <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12 }}>
                <Button href="mailto:hello@pencil.studio?subject=Talk%20to%20us" variant="outline">
                  <Mail size={16} aria-hidden /> hello@pencil.studio
                </Button>
                <Button href="/feasibility" variant="ghost">
                  <Sparkles size={16} aria-hidden /> Run a free check first
                </Button>
              </div>
            </div>

            <div style={{ maxWidth: 480, width: "100%" }}>
              <ContactForm />
            </div>
          </div>
        </Container>
      </Section>
    </main>
  );
}
