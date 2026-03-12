import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "FAQ — HOW TO DADU",
  description:
    "Frequently asked questions about DADU design, middle housing, property acquisition, and our process in Seattle.",
};

const faqs = [
  {
    category: "About Us",
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
    category: "Middle Housing",
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
    <>
      <Header />
      <main className="pt-20">
        <section className="py-24 md:py-32">
          <div className="mx-auto max-w-3xl px-6 md:px-12">
            <div className="mb-16">
              <p className="overline mb-4">
                FAQ
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-tight mb-6 text-[var(--foreground)]">
                Frequently asked
                <br />
                questions
              </h1>
              <p className="text-lg text-[var(--muted-foreground)] leading-relaxed max-w-xl">
                Everything you need to know about working with us,
                middle housing in Seattle, and our process.
              </p>
            </div>

            <div className="space-y-16">
              {faqs.map((group) => (
                <div key={group.category}>
                  <p className="overline mb-6">
                    {group.category}
                  </p>
                  <Accordion type="single" collapsible className="w-full">
                    {group.items.map((faq, i) => (
                      <AccordionItem
                        key={i}
                        value={`${group.category}-${i}`}
                        className="border-b border-[var(--border)]"
                      >
                        <AccordionTrigger className="text-left text-base font-medium py-5 hover:no-underline text-[var(--foreground)] [&[data-state=open]>svg]:rotate-180">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-[var(--muted-foreground)] leading-relaxed pb-5">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
