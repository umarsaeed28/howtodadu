"use client";

import { useId, useState } from "react";
import { Check, Loader2, ArrowRight } from "lucide-react";

export default function NewsletterField() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const id = useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      // TODO: wire to email provider / CRM.
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? "ok" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "ok") {
    return (
      <p className="s-body" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)", fontSize: "0.92rem" }}>
        <Check size={16} aria-hidden /> Thanks. You&apos;re on the list.
      </p>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8 }}>
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <input
        id={id}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@firm.com"
        className="s-field"
        style={{ minHeight: 44 }}
      />
      <button
        type="submit"
        className="s-btn s-btn--primary"
        aria-label="Subscribe"
        disabled={state === "loading"}
        style={{ minHeight: 44, padding: "0 0.9rem" }}
      >
        {state === "loading" ? (
          <Loader2 size={16} className="animate-spin" aria-hidden />
        ) : (
          <ArrowRight size={16} aria-hidden />
        )}
      </button>
    </form>
  );
}
