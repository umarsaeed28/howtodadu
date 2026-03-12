"use client";

import Link from "next/link";
import { FeasibilityClient } from "@/components/FeasibilityClient";
import { FeasibilityProvider, useFeasibilityContext } from "@/contexts/FeasibilityContext";

function FeasibilityLayoutInner() {
  const ctx = useFeasibilityContext();
  const hasResults = ctx?.hasResults ?? false;

  return (
    <div className="bg-[var(--background)] text-[var(--foreground)] min-h-screen flex flex-col">
      {/* Minimal header - shown only when no results (hero state) */}
      {!hasResults && (
        <header className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-[var(--border)] bg-[var(--background)] sticky top-0 z-50 uppercase tracking-[0.15em] text-[13px] font-bold">
        <Link href="/" className="font-display text-base tracking-[0.05em] no-underline text-[var(--foreground)] hover:opacity-80">
          HOW TO DADU
        </Link>
        <nav className="flex items-center gap-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <Link href="/" className="text-sm no-underline">
            Home
          </Link>
          <Link href="/faq" className="text-sm no-underline">
            FAQ
          </Link>
        </nav>
      </header>
      )}

      <main className="flex-1">
        <FeasibilityClient />
      </main>

      {/* AURA footer - simple */}
      <footer className="border-t border-[var(--border)] bg-[var(--background)] px-6 md:px-12 py-12">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <p className="text-sm text-[var(--muted-foreground)]">
            Seattle City GIS · Preliminary insights only
          </p>
          <div className="flex gap-6 text-sm">
            <Link href="/" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors no-underline">
              Home
            </Link>
            <Link href="/faq" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors no-underline">
              FAQ
            </Link>
            <a href="mailto:hello@howtodadu.com" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              Contact
            </a>
          </div>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mt-6 text-center">
          © {new Date().getFullYear()} How to DADU
        </p>
      </footer>
    </div>
  );
}

export function FeasibilityLayout() {
  return (
    <FeasibilityProvider>
      <FeasibilityLayoutInner />
    </FeasibilityProvider>
  );
}
