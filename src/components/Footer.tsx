"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function Footer() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail("");
    }
  }

  return (
    <footer id="contact" className="border-t border-[var(--border)] bg-[var(--muted)]/50">
      <div className="mx-auto max-w-6xl px-6 md:px-12 py-20 md:py-24">
        <div className="grid md:grid-cols-2 gap-16 mb-16">
          <div>
            <h3 className="font-serif text-lg font-medium text-[var(--foreground)] mb-3">
              How to DADU
            </h3>
            <p className="text-[var(--muted-foreground)] leading-relaxed max-w-md">
              A Seattle-based acquisition service focused on middle housing.
              We help investors identify properties and understand where and
              how middle housing can be built.
            </p>
          </div>

          <div>
            <p className="overline mb-4">Newsletter</p>
            {submitted ? (
              <p className="text-[var(--muted-foreground)]">Thanks for subscribing.</p>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex gap-3">
                <input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email for newsletter"
                  className="flex h-12 flex-1 border border-[var(--border)] bg-[var(--card)] px-4 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                />
                <button
                  type="submit"
                  className="shrink-0 h-12 px-6 bg-transparent border border-[var(--border)] text-[var(--foreground)] font-medium text-xs uppercase tracking-wider hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors flex items-center gap-2"
                >
                  Subscribe
                  <ArrowRight className="size-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-8 pt-8 border-t border-[var(--border)]">
          <div className="flex flex-wrap gap-8">
            <Link href="/#about" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-sm">
              What we do
            </Link>
            <Link href="/#who" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-sm">
              Who this is for
            </Link>
            <Link href="/#services" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-sm">
              What we help with
            </Link>
            <Link href="/feasibility" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-sm">
              Feasibility tool
            </Link>
            <Link href="/#process" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-sm">
              Process
            </Link>
            <Link href="/#faq" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-sm">
              FAQ
            </Link>
          </div>

          <div>
            <p className="text-[var(--muted-foreground)] text-sm">Seattle, Washington</p>
            <a
              href="mailto:hello@howtodadu.com"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-sm"
            >
              hello@howtodadu.com
            </a>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            © {new Date().getFullYear()} How to DADU
          </p>
          <div className="flex gap-8 text-sm text-[var(--muted-foreground)]">
            <a href="#" className="hover:text-[var(--foreground)] transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-[var(--foreground)] transition-colors">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
