"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

const navLinks = [
  { label: "What We Do", href: "#what-we-help" },
  { label: "Process", href: "#process" },
  { label: "FAQ", href: "#faq" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)] border-b border-[var(--border)] uppercase tracking-[0.15em] text-[13px] font-bold"
      role="banner"
    >
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 md:px-12 h-16">
        <Link href="/" className="font-display text-base tracking-[0.05em] no-underline text-[var(--foreground)] hover:opacity-80">
          HOW TO DADU
        </Link>

        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors font-normal normal-case tracking-normal">
              {link.label}
            </a>
          ))}
          <Link href="/feasibility" className="bg-transparent border border-[var(--border)] text-[var(--foreground)] px-5 py-2 hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors no-underline">
            Start Feasibility Check
          </Link>
        </nav>

        <button className="md:hidden p-2 text-[var(--foreground)]" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen}>
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--background)]">
          <nav className="flex flex-col px-6 py-5 gap-1" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-base font-medium text-[var(--foreground)] py-3 border-b border-[var(--border)]/50 normal-case" onClick={() => setMobileOpen(false)}>
                {link.label}
              </a>
            ))}
            <Link href="/feasibility" className="mt-3 inline-flex justify-center items-center text-base font-medium bg-transparent border border-[var(--border)] text-[var(--foreground)] py-3 px-5 w-full hover:bg-[var(--foreground)] hover:text-[var(--background)] normal-case" onClick={() => setMobileOpen(false)}>
              Start Feasibility Check
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
