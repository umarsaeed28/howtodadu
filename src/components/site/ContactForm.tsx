"use client";

import { useId, useState } from "react";
import { Check, Loader2, ArrowRight } from "lucide-react";

export default function ContactForm() {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const nameId = useId();
  const emailId = useId();
  const msgId = useId();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      // TODO: wire to email or CRM. Reuse /api/subscribe to capture the email for now.
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      setState("ok");
      form.reset();
    } catch {
      setState("error");
    }
  }

  if (state === "ok") {
    return (
      <div className="s-card s-card--pad" role="status" style={{ textAlign: "center" }}>
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            height: 44,
            width: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            background: "var(--green-tint)",
            color: "var(--green)",
          }}
        >
          <Check size={22} />
        </span>
        <h3 className="s-h3" style={{ marginTop: 16 }}>
          Thanks. We&apos;ll be in touch.
        </h3>
        <p className="s-body" style={{ marginTop: 8, fontSize: "0.95rem" }}>
          We read every message and reply personally.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="s-card s-card--pad">
      <div style={{ display: "grid", gap: 18 }}>
        <div>
          <label htmlFor={nameId} className="s-label">
            Your name
          </label>
          <input id={nameId} name="name" className="s-field" autoComplete="name" />
        </div>
        <div>
          <label htmlFor={emailId} className="s-label">
            Email
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            required
            className="s-field"
            autoComplete="email"
            placeholder="you@firm.com"
          />
        </div>
        <div>
          <label htmlFor={msgId} className="s-label">
            What are you looking for?
          </label>
          <textarea
            id={msgId}
            name="message"
            rows={4}
            className="s-field"
            style={{ minHeight: 120, paddingTop: 12, paddingBottom: 12, lineHeight: 1.6 }}
            placeholder="Market, budget, timeline, and what you want to build."
          />
        </div>
        <button type="submit" className="s-btn s-btn--primary s-btn--lg" disabled={state === "loading"}>
          {state === "loading" ? (
            <>
              <Loader2 size={17} className="animate-spin" aria-hidden /> Sending
            </>
          ) : (
            <>
              Send message <ArrowRight size={17} aria-hidden />
            </>
          )}
        </button>
        {state === "error" && (
          <p className="s-body" role="alert" style={{ color: "var(--red)", fontSize: "0.9rem" }}>
            Something went wrong. Email us at hello@pencil.studio.
          </p>
        )}
      </div>
    </form>
  );
}
