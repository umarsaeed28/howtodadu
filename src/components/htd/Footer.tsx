const LINKS = [
  { label: "Overview", href: "#overview" },
  { label: "What we do", href: "#what-we-do" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Properties", href: "#properties" },
  { label: "FAQ", href: "#faq" },
];

export default function Footer() {
  return (
    <footer className="htd-pine" aria-labelledby="footer-title">
      <h2 id="footer-title" className="sr-only">
        Site footer
      </h2>
      <div className="htd-container" style={{ paddingTop: "5rem", paddingBottom: "3rem" }}>
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr]">
          <div>
            <p className="htd-display text-xl" style={{ color: "var(--bone)" }}>
              How to DADU
            </p>
            <p className="htd-body-text mt-3 max-w-sm text-sm" style={{ color: "var(--sage)" }}>
              We help investors find, plan, and build middle housing in Seattle.
            </p>
          </div>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2.5 md:flex-col">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="htd-link htd-body-text text-sm" style={{ color: "var(--bone)" }}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14" style={{ borderTop: "1px solid var(--hairline-dk)", paddingTop: "1.5rem" }}>
          <p className="htd-mono text-xs" style={{ color: "var(--sage)", letterSpacing: "0.04em" }}>
            Seattle, Washington. hello@howtodadu.com
          </p>
          {/* TODO: have counsel review before launch. */}
          <p className="htd-body-text mt-5 max-w-3xl text-sm" style={{ color: "rgba(237,238,232,0.6)" }}>
            This site is for information only. It is not an offer to buy or sell any investment.
            Anything we show about cost or value is an estimate, not a promise.
          </p>
          <p className="htd-mono mt-6 text-xs" style={{ color: "var(--sage)" }}>
            © 2026 How to DADU
          </p>
        </div>
      </div>
    </footer>
  );
}
