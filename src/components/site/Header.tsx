"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import ProfileMenu from "./ProfileMenu";

const NAV = [
  { href: "/feasibility", label: "Check my lot" },
  // Points at the free calculator until /proforma ships (docs/PROFORMA_PLAN.md, phase 3).
  { href: "/calculator", label: "Proforma" },
  { href: "/company", label: "About us" },
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
  // Saved listings live behind the admin gate with the map (src/lib/admin/gate.ts), so the public nav has no Saved link.
  const nav = NAV;

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
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="site-actions">
          <ProfileMenu />
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
            <ProfileMenu variant="sheet" />
          </div>
        </div>
      )}
    </header>
  );
}
