import type { Metadata } from "next";
import { Section, Container, Eyebrow, Heading, Lede } from "@/components/ui";

export const metadata: Metadata = {
  title: "FAQ — Pencil",
  description:
    "Frequently asked questions about DADU design, middle housing, property acquisition, and our process in Seattle.",
};

const faqs = [
  {
    category: "About us",
    items: [
      {
        question: "What makes you different from an architecture firm?",
        answer:
          "We combine property acquisition strategy with architectural design. Your project starts on the right lot with the right plan from day one.",
      },
      {
        question: "Do you only work in Seattle?",
        answer:
          "Yes. Our focus on Seattle gives us deep knowledge of local zoning codes, permitting, and the middle housing reforms that shape what you can build.",
      },
      {
        question: "Who do you typically work with?",
        answer:
          "Property owners looking to build on their lot, investors evaluating development potential, and buyers searching for the right property to develop.",
      },
    ],
  },
  {
    category: "Services",
    items: [
      {
        question: "Can you help me find a property to develop?",
        answer:
          "Yes. We evaluate properties through a design-first lens — analyzing zoning, lot dimensions, and development potential before you commit to a purchase.",
      },
      {
        question: "Do you handle the permitting process?",
        answer:
          "We produce permit-ready architectural drawings that meet Seattle's requirements. While we don't file permits directly, we prepare all necessary documentation and guide you through the submission process.",
      },
      {
        question: "Do you connect clients with builders?",
        answer:
          "Yes. We work with a network of vetted builders who specialize in middle housing construction. The transition from drawings to construction is part of our process.",
      },
    ],
  },
  {
    category: "Middle housing",
    items: [
      {
        question: "What is middle housing?",
        answer:
          "Building types between single-family homes and large apartments: DADUs, duplexes, triplexes, and fourplexes. Seattle's zoning reforms have expanded where these can be built.",
      },
      {
        question: "What is a DADU?",
        answer:
          "A Detached Accessory Dwelling Unit — a separate, smaller home built on the same lot as an existing house. DADUs are one of the most accessible forms of middle housing in Seattle.",
      },
      {
        question: "How have Seattle's zoning reforms changed what I can build?",
        answer:
          "Recent reforms allow duplexes, triplexes, and fourplexes in most residential zones that were previously limited to single-family homes. This significantly expands development options for property owners across the city.",
      },
      {
        question: "How long does a typical project take?",
        answer:
          "Timelines vary by project scope. A DADU typically takes 3–4 months for design and permitting. Larger projects like triplexes or fourplexes may take 4–6 months. Construction timelines depend on the builder and project complexity.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <main>
      <Section>
        <Container style={{ maxWidth: 820 }}>
          <Eyebrow>FAQ</Eyebrow>
          <Heading level={1} style={{ marginTop: 18 }}>
            Frequently asked questions.
          </Heading>
          <Lede style={{ marginTop: 22, maxWidth: "36rem" }}>
            Everything you need to know about working with us, middle housing in Seattle, and our
            process.
          </Lede>

          <div style={{ marginTop: 48, display: "grid", gap: 48 }}>
            {faqs.map((group) => (
              <div key={group.category}>
                <Eyebrow style={{ color: "var(--slate)", marginBottom: 12 }}>{group.category}</Eyebrow>
                <div>
                  {group.items.map((faq, i) => (
                    <details
                      key={i}
                      style={{ borderBottom: "1px solid var(--line)", paddingBlock: 18 }}
                    >
                      <summary
                        className="s-h3"
                        style={{ cursor: "pointer", listStyle: "none", fontSize: "1.05rem" }}
                      >
                        {faq.question}
                      </summary>
                      <p className="s-body" style={{ marginTop: 12, fontSize: "0.98rem" }}>
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </main>
  );
}
