"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const NAV = [
  { href: "/product", label: "How it works" },
  { href: "/feasibility", label: "Check a property", primary: true },
  { href: "/insights", label: "Insights" },
  { href: "/company", label: "Company" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" className="site-brand" onClick={onClick} aria-label="Pencil — home">
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
  );
}

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || pathname !== "/";

  return (
    <header className="site-header" data-solid={solid}>
      <div className="site-header-inner">
        <Brand />

        <nav className="site-nav" aria-label="Primary">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="site-nav-link"
              data-active={isActive(pathname, l.href)}
              data-primary={l.primary ? true : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="site-actions">
          <Link href="/feasibility" className="s-btn s-btn--primary">
            Check a property
          </Link>
          <Link href="/contact" className="s-btn s-btn--ghost">
            Talk to us
          </Link>
        </div>

        <button
          type="button"
          className="site-burger"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu size={22} aria-hidden />
        </button>
      </div>

      {open && (
        <div className="site-sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: "var(--nav-h)",
            }}
          >
            <Brand onClick={() => setOpen(false)} />
            <button
              type="button"
              className="site-burger"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <X size={24} aria-hidden />
            </button>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", marginTop: 8 }} aria-label="Mobile">
            {NAV.map((l) => (
              <Link key={l.href} href={l.href} className="site-sheet-link" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div style={{ marginTop: "auto", paddingTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            <Link
              href="/feasibility"
              className="s-btn s-btn--primary s-btn--lg"
              style={{ width: "100%" }}
              onClick={() => setOpen(false)}
            >
              Check a property
            </Link>
            <Link
              href="/contact"
              className="s-btn s-btn--ghost s-btn--lg"
              style={{ width: "100%" }}
              onClick={() => setOpen(false)}
            >
              Talk to us
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
