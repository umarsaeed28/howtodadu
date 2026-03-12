import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is a DADU?",
    answer:
      "A DADU (Detached Accessory Dwelling Unit) is a small, separate house on the same lot as your main home. Often called a backyard cottage or granny flat. Seattle allows DADUs in many single-family zones under its middle housing rules.",
  },
  {
    question: "Do you help investors find properties?",
    answer:
      "We help you understand what to look for. We evaluate properties you're considering and guide you through the feasibility process. We are not a sales platform—we focus on design and development guidance.",
  },
  {
    question: "Is the feasibility tool accurate?",
    answer:
      "The tool provides preliminary insights based on publicly available data and Seattle resources. Results are not a final determination. We recommend professional review before making investment decisions.",
  },
  {
    question: "Do you handle permits?",
    answer:
      "We prepare architectural drawing sets that are ready for permit submission. We guide you through the process but do not file permits on your behalf. You or your builder would submit to Seattle DCI.",
  },
  {
    question: "Do you work only in Seattle?",
    answer:
      "Yes. Our focus is Seattle's zoning, permitting, and middle housing regulations. We have the most experience and resources for Seattle properties.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-20 md:py-28 border-t border-[var(--border)]">
      <div className="mx-auto max-w-5xl px-6 md:px-12">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-16">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-[var(--foreground)]">
              Frequently asked questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border-b border-[var(--border)] last:border-b-0"
              >
                <AccordionTrigger className="text-left font-medium py-5 hover:no-underline text-[var(--foreground)] [&[data-state=open]>svg]:rotate-180">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[var(--muted-foreground)] leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
