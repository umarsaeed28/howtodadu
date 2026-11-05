"use client";

import { useId, useRef, useState } from "react";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { EMAIL_RE, grantReportAccess } from "@/lib/report-access";

/**
 * The card over a blurred report. One email unlocks every report in this browser; it is saved as a "report" sign-up.
 * If saving fails because the server is down, the report still opens: the gate never strands someone.
 */
export default function ReportEmailGate({ address, onUnlock }: { address: string; onUnlock: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "invalid">("idle");
  const inputId = useId();
  const errId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setState("invalid");
      inputRef.current?.focus();
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, kind: "report", message: address, source: window.location.pathname + window.location.search }),
      });
      if (res.status === 422) {
        setState("invalid");
        inputRef.current?.focus();
        return;
      }
    } catch {
      /* network trouble: open the report anyway */
    }
    grantReportAccess(value);
    onUnlock();
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${inputId}-h`}
      className="w-full max-w-[440px] rounded-2xl p-6 sm:p-7"
      style={{ background: "var(--card, #fff)", boxShadow: "0 1px 2px rgba(23,36,29,.08), 0 24px 60px -24px rgba(23,36,29,.45)" }}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--green-tint)", color: "var(--green)" }} aria-hidden>
        <LockKeyhole size={18} />
      </span>
      <h3 id={`${inputId}-h`} className="pa-display mt-4 text-xl" style={{ color: "var(--ink)" }}>
        Your report for {address} is ready
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--slate)" }}>
        Enter your email to open the full feasibility report: the verdict, the master plan you can edit, the site checks and the PDF. One email unlocks every report.
      </p>
      <form onSubmit={submit} noValidate className="mt-5">
        <label htmlFor={inputId} className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
          Email
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <input
            ref={inputRef}
            id={inputId}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === "invalid") setState("idle");
            }}
            placeholder="you@example.com"
            aria-invalid={state === "invalid"}
            aria-describedby={state === "invalid" ? errId : undefined}
            className="min-w-0 flex-1 rounded-[10px] px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--bg, #F3F5F2)", boxShadow: state === "invalid" ? "inset 0 0 0 1.5px var(--red)" : "inset 0 0 0 1px var(--line-strong, #CBD3CE)", color: "var(--ink)" }}
          />
          <button type="submit" className="pa-btn pa-btn-primary" disabled={state === "loading"} style={{ minHeight: 42 }}>
            {state === "loading" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
            {state === "loading" ? "Opening…" : "See the report"}
            {state === "loading" ? null : <ArrowRight size={15} aria-hidden />}
          </button>
        </div>
        {state === "invalid" && (
          <p id={errId} role="alert" className="mt-2 text-xs" style={{ color: "var(--red)" }}>
            Enter a valid email, like name@example.com.
          </p>
        )}
        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--slate)" }}>
          We send the occasional DADU deal or update. No spam; unsubscribe any time.
        </p>
      </form>
    </div>
  );
}
