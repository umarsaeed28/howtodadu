import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section
      className="relative pt-28 pb-24 md:pt-36 md:pb-32"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto max-w-3xl px-6 md:px-12">
        <h1
          id="hero-heading"
          className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-[var(--foreground)] mb-6"
        >
          How to DADU
        </h1>
        <p className="text-xl md:text-2xl text-[var(--muted-foreground)] font-light leading-relaxed mb-6">
          A guide to investing in middle housing in Seattle.
        </p>
        <p className="text-base md:text-lg text-[var(--muted-foreground)] leading-relaxed max-w-2xl mb-12">
          A real estate acquisition firm focused on middle housing. We help
          investors identify the right property, evaluate development potential,
          and design projects that are ready for permits.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/feasibility"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-transparent border border-[var(--border)] text-[var(--foreground)] font-medium text-xs uppercase tracking-wider hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors"
          >
            Start Feasibility Check
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <a
            href="#process"
            className="inline-flex items-center justify-center h-12 px-8 border border-[var(--border)] font-medium text-sm text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors"
          >
            Learn How the Process Works
          </a>
        </div>
      </div>
    </section>
  );
}
