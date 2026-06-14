"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";

export default function Subscribe({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const id = useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMsg("");
    try {
      // TODO: wire to email provider (Resend / ConvertKit).
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
            ? "That address does not look valid."
            : "Subscription could not be completed."
        );
      }
    } catch {
      setState("error");
      setMsg("Subscription could not be completed.");
    }
  }

  const muted = dark ? "var(--sage)" : "var(--slate)";

  if (state === "ok") {
    return (
      <p
        className="htd-body flex items-center gap-2 text-sm"
        style={{ color: dark ? "var(--bone)" : "var(--forest)" }}
        role="status"
      >
        <Check size={16} aria-hidden /> Thanks. You&apos;re on the list.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md">
      <div className="flex gap-2">
        <div className="flex-1">
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
            className="htd-mono w-full bg-transparent px-3 text-sm"
            style={{
              minHeight: 48,
              border: `1px solid ${dark ? "var(--hairline-dk)" : "var(--hairline)"}`,
              borderRadius: 4,
              color: dark ? "var(--bone)" : "var(--ink)",
            }}
          />
        </div>
        <button type="submit" className="htd-btn htd-btn-forest" disabled={state === "loading"}>
          {state === "loading" ? "…" : "Subscribe"}
        </button>
      </div>
      {state === "error" && (
        <p className="htd-body mt-2 text-xs" style={{ color: muted }} role="alert">
          {msg}
        </p>
      )}
    </form>
  );
}
