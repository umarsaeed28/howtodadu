"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export type FaqItem = { q: string; a: React.ReactNode };

/** The FAQ as an accessible accordion (Radix): one open at a time, keyboard operable, answers in the DOM. */
export default function Faq({ items }: { items: FaqItem[] }) {
  return (
    <Accordion type="single" collapsible className="faq">
      {items.map((it, i) => (
        <AccordionItem key={it.q} value={`q${i}`} className="faq-item">
          <AccordionTrigger className="faq-q">{it.q}</AccordionTrigger>
          <AccordionContent className="faq-a">{it.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
