"use client";

import { useId, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function EmailCapture({ className = "" }: { className?: string }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setStatus("error");
        setMessage(
          data?.error === "invalid_email"
            ? "Enter a valid email address."
            : "Something went wrong. Please try again."
        );
        return;
      }
      setStatus("success");
      setMessage("You're on the list — first digest lands tomorrow morning.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <p
        role="status"
        className={`pencil-mono text-[0.9rem] ${className}`}
        style={{ color: "var(--green)" }}
      >
        ✓ {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`w-full ${className}`} noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={id} className="sr-only">
          Email address for the Daily Deals digest
        </label>
        <input
          id={id}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@studio.com"
          aria-invalid={status === "error"}
          aria-describedby={message ? `${id}-msg` : undefined}
          className="pencil-mono min-h-[44px] flex-1 rounded-[4px] border bg-[var(--card)] px-4 text-[0.95rem] text-[var(--ink)] placeholder:text-[var(--slate)]/70"
          style={{ borderColor: "var(--hairline)" }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="pencil-btn pencil-btn-primary disabled:opacity-70"
        >
          {status === "loading" ? "Adding…" : "Get the daily deals"}
        </button>
      </div>
      {status === "error" && message ? (
        <p
          id={`${id}-msg`}
          role="alert"
          className="pencil-mono mt-2 text-[0.82rem] text-[var(--ink)]"
        >
          {/* red is reserved for the cost contrast; error stays graphite + explicit text */}
          Error — {message}
        </p>
      ) : null}
    </form>
  );
}
