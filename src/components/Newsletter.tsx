"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitted(true);
    setEmail("");
  }

  return (
    <section id="newsletter" className="py-20 md:py-28 border-t border-[var(--border)] bg-[var(--muted)]/50">
      <div className="mx-auto max-w-5xl px-6 md:px-12">
        <h2 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-[var(--foreground)] mb-4">
          Seattle middle housing updates
        </h2>
        <p className="text-[var(--muted-foreground)] leading-relaxed max-w-2xl mb-10">
          Occasional updates about DADU development, zoning changes, design
          insights, and investment considerations in Seattle.
        </p>

        {submitted ? (
          <p className="text-[var(--foreground)] font-medium">Thanks for subscribing. We&apos;ll be in touch.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl">
            <div className="flex-1">
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                required
                aria-label="Email address"
                aria-invalid={!!error}
                aria-describedby={error ? "email-error" : undefined}
                className="flex h-12 w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-4 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
              />
              {error && (
                <p id="email-error" className="text-sm text-red-600 mt-2" role="alert">
                  {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 bg-[var(--primary)] text-[var(--primary-foreground)] font-medium text-xs uppercase tracking-wider rounded-full hover:opacity-90 transition-opacity"
            >
              Subscribe
              <ArrowRight className="size-4" />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
