import { Wordmark } from "./Wordmark";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Daily deals", href: "#daily-deals" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Contact", href: "mailto:hello@pencil.studio" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer style={{ backgroundColor: "var(--paper)" }}>
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-[28ch] text-[0.95rem] leading-[1.6] text-[var(--slate)]">
              Middle-housing feasibility for the Puget Sound.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="pencil-mono text-[0.7rem] uppercase tracking-[0.12em] text-[var(--slate)]">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-[0.95rem] text-[var(--ink)] transition-colors hover:text-[var(--green)]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <hr className="my-10 border-0 border-t" style={{ borderColor: "var(--hairline)" }} />

        <p className="pencil-mono text-[0.72rem] uppercase tracking-[0.1em] text-[var(--slate)]">
          © 2026 Pencil · Does it pencil?
        </p>
      </div>
    </footer>
  );
}
