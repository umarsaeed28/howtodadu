export function WhatThisServiceIs() {
  return (
    <section
      id="about"
      className="py-20 md:py-28 border-t border-[var(--border)]"
      aria-labelledby="what-title"
    >
      <div className="mx-auto max-w-3xl px-6 md:px-12">
        <h2
          id="what-title"
          className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-[var(--foreground)] mb-8"
        >
          What is How to DADU?
        </h2>

        <div className="space-y-6 text-[var(--muted-foreground)] leading-relaxed">
          <p>
            How to DADU is an acquisition service focused on middle housing
            in Seattle.
          </p>
          <p>
            We work with investors who want to build DADUs or small multifamily
            housing.
          </p>
          <p>Our role is to guide the early development process.</p>
          <p>
            This includes identifying the right property, exploring development
            potential, and preparing architectural drawings for permits.
          </p>
        </div>
      </div>
    </section>
  );
}
