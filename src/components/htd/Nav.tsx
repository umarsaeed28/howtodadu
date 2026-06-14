"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#overview", label: "Overview" },
  { href: "#what-we-do", label: "What we do" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#properties", label: "Properties" },
  { href: "#faq", label: "FAQ" },
];

export default function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={{
        background: solid ? "var(--bone)" : "transparent",
        borderBottom: solid ? "1px solid var(--hairline)" : "1px solid transparent",
      }}
    >
      <nav
        className="htd-container flex items-center justify-between"
        style={{ height: 68 }}
        aria-label="Primary"
      >
        <a
          href="#top"
          className="htd-display text-lg"
          style={{ color: solid ? "var(--ink)" : "var(--bone)" }}
        >
          How to DADU
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="htd-link text-sm"
              style={{ color: solid ? "var(--ink)" : "var(--bone)" }}
            >
              {l.label}
            </a>
          ))}
          <a href="#talk" className="htd-btn htd-btn-forest" style={{ minHeight: 40, padding: "0.5rem 1rem" }}>
            Talk to us
          </a>
        </div>

        <button
          type="button"
          className="md:hidden flex h-11 w-11 items-center justify-center"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          style={{ color: solid ? "var(--ink)" : "var(--bone)" }}
        >
          <Menu size={22} aria-hidden />
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" style={{ background: "var(--pine)" }}>
          <div className="htd-container flex items-center justify-between" style={{ height: 68 }}>
            <span className="htd-display text-lg" style={{ color: "var(--bone)" }}>
              How to DADU
            </span>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              style={{ color: "var(--bone)" }}
            >
              <X size={22} aria-hidden />
            </button>
          </div>
          <div className="htd-container flex flex-col gap-1 pt-6">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="htd-display border-b py-4 text-2xl"
                style={{ color: "var(--bone)", borderColor: "var(--hairline-dk)" }}
              >
                {l.label}
              </a>
            ))}
            <a
              href="#talk"
              onClick={() => setOpen(false)}
              className="htd-btn htd-btn-forest mt-6"
            >
              Talk to us
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
