import Link from "next/link";
import NewsletterField from "./NewsletterField";

const GROUPS = [
  {
    title: "Product",
    links: [
      { href: "/product", label: "How it works" },
      { href: "/feasibility", label: "Check a property" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/company", label: "About Pencil" },
      { href: "/contact", label: "Talk to us" },
    ],
  },
  {
    title: "Insights",
    links: [
      { href: "/insights", label: "Guides" },
      { href: "/insights", label: "Zoning updates" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/faq", label: "How estimates work" },
      { href: "mailto:hello@pencil.studio", label: "Contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <Link href="/" className="site-brand" aria-label="Pencil — home">
            <span className="site-brand-mark" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 19l2-6L17 3l4 4L11 17l-6 2z"
                  stroke="#fff"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="site-brand-name">Pencil</span>
          </Link>
          <p className="s-body" style={{ marginTop: 14, maxWidth: "22rem", fontSize: "0.95rem" }}>
            See what a property can become. Pencil reads the parcel, the zoning, and the build
            options, then opens a complete guide for each realistic scenario.
          </p>
          <div style={{ marginTop: 20, maxWidth: "22rem" }}>
            <p className="site-footer-coltitle">Stay in the loop</p>
            <NewsletterField />
          </div>
        </div>

        <div className="site-footer-cols">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="site-footer-coltitle">{g.title}</p>
              {g.links.map((l, i) =>
                l.href.startsWith("mailto:") ? (
                  <a key={`${l.href}-${i}`} href={l.href} className="site-footer-link">
                    {l.label}
                  </a>
                ) : (
                  <Link key={`${l.href}-${i}`} href={l.href} className="site-footer-link">
                    {l.label}
                  </Link>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="site-footer-base">
        <div className="site-footer-base-inner">
          <span>© {new Date().getFullYear()} Pencil. All rights reserved.</span>
          <span>Estimates are preliminary and not a guarantee of permit outcomes.</span>
        </div>
      </div>
    </footer>
  );
}
