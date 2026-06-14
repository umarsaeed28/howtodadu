"use client";

import { useState } from "react";
import { Mail, Check } from "lucide-react";

export default function SubscribeBanner() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setState("ok");
      } else {
        const data = await res.json().catch(() => ({}));
        setState("error");
        setMsg(
          data?.error === "invalid_email"
            ? "Error — that doesn’t look like a valid email."
            : "Error — couldn’t subscribe just now."
        );
      }
    } catch {
      setState("error");
      setMsg("Error — couldn’t reach the server.");
    }
  }

  return (
    <div
      className="pa-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
      style={{ background: "var(--green-tint)", borderColor: "var(--green)" }}
    >
      <div>
        <p className="pa-display text-base" style={{ color: "var(--green)" }}>
          Get the deals that pencil, every morning
        </p>
        <p className="text-sm" style={{ color: "var(--ink)" }}>
          One email · ranked by margin · Seattle / Puget Sound.
        </p>
      </div>

      {state === "ok" ? (
        <p
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: "var(--green)" }}
          role="status"
        >
          <Check size={16} aria-hidden /> You’re on the list.
        </p>
      ) : (
        <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-1">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--slate)" }}
                aria-hidden
              />
              <label htmlFor="pa-sub" className="sr-only">
                Email address
              </label>
              <input
                id="pa-sub"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@firm.com"
                className="w-full rounded-[6px] border bg-[var(--card)] py-2 pl-9 pr-3 text-sm pa-mono"
                style={{ borderColor: "var(--hairline)" }}
              />
            </div>
            <button
              type="submit"
              className="pa-btn pa-btn-primary"
              disabled={state === "loading"}
            >
              {state === "loading" ? "…" : "Subscribe"}
            </button>
          </div>
          {state === "error" && (
            <p className="text-xs" style={{ color: "var(--ink)" }} role="alert">
              {msg}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
