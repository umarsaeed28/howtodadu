"use client";

import { useId, useState } from "react";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics";

const STAGES = ["Looking for a lot", "I own a lot", "I have plans", "Ready to build"] as const;
const HELP = ["All of it, end to end", "Acquisition", "Feasibility", "Design", "Permit", "Construction"] as const;

/**
 * The free consult request: who they are, where they are in the project, what they want help with.
 * Saved as a contact sign-up; the details ride in the message so no new table is needed.
 */
export default function ContactForm({ address = "" }: { address?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const id = useId();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const stage = get("stage");
    const help = fd.getAll("help").map(String);
    const message = [
      "Free consult request",
      stage && `Stage: ${stage}`,
      help.length ? `Help with: ${help.join(", ")}` : "",
      get("phone") && `Phone: ${get("phone")}`,
      get("property") && `Property or area: ${get("property")}`,
      get("message") && `\n${get("message")}`,
    ].filter(Boolean).join("\n");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "contact", email: get("email"), name: get("name"), message, source: window.location.pathname }),
      });
      if (!res.ok) throw new Error(String(res.status));
      track("consult_requested", { stage: stage || "unsure", help: help.join("|") });
      setState("ok");
      form.reset();
    } catch {
      setState("error");
    }
  }

  if (state === "ok") {
    return (
      <div className="s-card s-card--pad cf-done" role="status">
        <span className="cf-done-icon" aria-hidden><Check size={22} /></span>
        <h2 className="s-h3">Thanks. Your consult request is in.</h2>
        <p className="s-body">We&apos;ll reach out by email or phone to set up a time. The consult is free, with no obligation.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="s-card s-card--pad cf">
      <div className="cf-row">
        <div>
          <label htmlFor={`${id}-name`} className="s-label">Your name</label>
          <input id={`${id}-name`} name="name" required className="s-field" autoComplete="name" />
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className="s-label">Phone <span className="cf-opt">(optional)</span></label>
          <input id={`${id}-phone`} name="phone" type="tel" className="s-field" autoComplete="tel" />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-email`} className="s-label">Email</label>
        <input id={`${id}-email`} name="email" type="email" required className="s-field" autoComplete="email" />
      </div>
      <div>
        <label htmlFor={`${id}-property`} className="s-label">Address or neighborhood <span className="cf-opt">(optional)</span></label>
        <input id={`${id}-property`} name="property" defaultValue={address} className="s-field" autoComplete="street-address" placeholder="e.g. 5519 12th Ave NE, or Ballard" />
      </div>

      <fieldset className="cf-set">
        <legend className="s-label">Where are you today?</legend>
        <div className="cf-chips">
          {STAGES.map((s) => (
            <label key={s} className="cf-chip">
              <input type="radio" name="stage" value={s} />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="cf-set">
        <legend className="s-label">Which stages should we run? <span className="cf-opt">(pick any)</span></legend>
        <div className="cf-chips">
          {HELP.map((h) => (
            <label key={h} className="cf-chip">
              <input type="checkbox" name="help" value={h} />
              <span>{h}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${id}-msg`} className="s-label">Anything else? <span className="cf-opt">(optional)</span></label>
        <textarea id={`${id}-msg`} name="message" rows={3} className="s-field cf-text" placeholder="Budget, timeline, what you hope to build, or your questions." />
      </div>

      <button type="submit" className="s-btn s-btn--primary s-btn--lg" disabled={state === "loading"}>
        {state === "loading" ? (<><Loader2 size={17} className="animate-spin" aria-hidden /> Sending</>) : (<>Request my free consult <ArrowRight size={17} aria-hidden /></>)}
      </button>
      {state === "error" && (
        <p className="s-body cf-err" role="alert">Something went wrong. Email us at hello@pencil.studio.</p>
      )}
    </form>
  );
}
