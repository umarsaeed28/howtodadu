"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Wordmark } from "./Wordmark";

const LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Daily deals", href: "#daily-deals" },
  { label: "Pricing", href: "#pricing" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 transition-colors duration-200"
      style={{
        backgroundColor: scrolled ? "var(--paper)" : "transparent",
        borderBottom: scrolled ? "1px solid var(--hairline)" : "1px solid transparent",
      }}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4"
      >
        <a href="#top" className="inline-flex items-center" aria-label="Pencil — home">
          <Wordmark />
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="pencil-mono text-[0.85rem] text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
            >
              {l.label}
            </a>
          ))}
          <a href="#request" className="pencil-btn pencil-btn-outline">
            Request a feasibility
          </a>
        </div>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="pencil-mobile-sheet"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </nav>

      {open ? (
        <div
          id="pencil-mobile-sheet"
          className="md:hidden"
          style={{ backgroundColor: "var(--paper)", borderBottom: "1px solid var(--hairline)" }}
        >
          <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-6 pb-5 pt-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="pencil-mono flex min-h-[44px] items-center text-[0.95rem] text-[var(--ink)]"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#request"
              onClick={() => setOpen(false)}
              className="pencil-btn pencil-btn-outline mt-2 w-full"
            >
              Request a feasibility
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
