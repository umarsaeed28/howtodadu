"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, X } from "lucide-react";
import { useSavedListings } from "@/hooks/useSavedListings";

const NAV = [
  { href: "/", label: "Map" },
  { href: "/feasibility", label: "Feasibility" },
  { href: "/calculator", label: "Calculator" },
  { href: "/insights", label: "Insights" },
  { href: "/company", label: "Company" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" className="site-brand" onClick={onClick} aria-label="Pencil — home">
      <span className="site-brand-mark" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 19l2-6L17 3l4 4L11 17l-6 2z"
            stroke="#ffffff"
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
  const [open, setOpen] = useState(false);
  const { saved } = useSavedListings();
  const nav = [...NAV, { href: "/saved", label: saved.length ? `Saved (${saved.length})` : "Saved", icon: true }];

  const solid = true;

  return (
    <header className="site-header" data-solid={solid}>
      <div className="site-header-inner">
        <Brand />

        <nav className="site-nav" aria-label="Primary">
          {nav.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="site-nav-link"
              data-active={isActive(pathname, l.href)}
            >
              {"icon" in l && l.icon && <Heart size={13} aria-hidden className="mr-1 inline" fill={saved.length ? "#C2412D" : "none"} color={saved.length ? "#C2412D" : "currentColor"} />}
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="site-actions">
          <Link href="/contact" className="s-btn s-btn--primary">
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "var(--nav-h)" }}>
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
            {nav.map((l) => (
              <Link key={l.href} href={l.href} className="site-sheet-link" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div style={{ marginTop: "auto", paddingTop: 24 }}>
            <Link
              href="/contact"
              className="s-btn s-btn--primary s-btn--lg"
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
