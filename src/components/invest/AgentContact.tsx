"use client";

import { useId, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { track } from "@/lib/analytics";

/** "Talk to an agent about this property": goes to Umar, Pencil's licensed broker. */
export default function AgentContact({ listingId, street }: { listingId: string; street: string }) {
  const [phase, setPhase] = useState<"form" | "sending" | "sent">("form");
  const [err, setErr] = useState<string | null>(null);
  const id = useId();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = { listingId, name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"), message: fd.get("message") };
    if (!String(body.name ?? "").trim()) return setErr("Tell us your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email ?? "").trim())) return setErr("Enter a valid email.");
    setErr(null);
    setPhase("sending");
    try {
      const r = await fetch("/api/invest/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { ok?: boolean };
      if (!r.ok || !j.ok) throw new Error();
      track("agent_contact_submitted", { listing_id: listingId });
      setPhase("sent");
    } catch {
      setPhase("form");
      setErr("That did not go through. Try again in a moment.");
    }
  }

  if (phase === "sent")
    return (
      <p className="iv-sent" aria-live="polite"><MailCheck size={18} aria-hidden /> Sent. Umar will reach out about {street} soon.</p>
    );

  return (
    <form className="iv-contact" onSubmit={submit} noValidate aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="iv-h3">Talk to an agent about this property</h3>
      <p className="iv-note">Umar Saeed, Pencil&apos;s licensed real estate broker, can tour it with you and talk through the numbers and an offer.</p>
      <div className="iv-fields">
        <label><span>Name</span><input name="name" autoComplete="name" required /></label>
        <label><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
        <label><span>Phone (optional)</span><input name="phone" type="tel" autoComplete="tel" /></label>
        <label className="iv-field-wide"><span>Message (optional)</span><textarea name="message" rows={3} defaultValue={`I'd like to talk about ${street}.`} /></label>
      </div>
      {err && <p role="alert" className="iv-watch-err">{err}</p>}
      <button type="submit" className="pa-btn pa-btn-primary" disabled={phase === "sending"}>
        {phase === "sending" && <Loader2 size={15} className="animate-spin" aria-hidden />} Send to Umar
      </button>
    </form>
  );
}
