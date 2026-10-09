"use client";

import { useState } from "react";
import { BadgeCheck, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { updateProfile } from "@/app/portal/actions";
import { ActionForm, field, label } from "./ActionForm";

/** Name, email and the optional email check. Verifying sends a one-time link; the account works either way. */
export default function AccountPanel({ name, email, role, verifiedAt, justVerified }: { name: string; email: string; role: string; verifiedAt: string | null; justVerified: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function verify() {
    setState("sending");
    setErr(null);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/portal/account?verified=1")}&verify=1` },
    });
    if (error) {
      setState("error");
      setErr(/rate|seconds/i.test(error.message) ? "A link was sent a moment ago. Wait a minute, then try again." : "We could not send the link. Try again shortly.");
    } else setState("sent");
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="pa-raised p-5 sm:p-6" aria-labelledby="email-h">
        <h2 id="email-h" className="pa-display text-lg" style={{ color: "var(--ink)" }}>Email</h2>
        <p className="mt-1 text-base font-semibold" style={{ color: "var(--ink)" }}>{email}</p>
        {verifiedAt ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold" style={{ background: "var(--green-tint)", color: "var(--green)" }}>
            <BadgeCheck size={16} aria-hidden /> {justVerified ? "Verified. Thank you." : `Verified ${new Date(verifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
          </p>
        ) : (
          <div className="mt-3">
            <p className="text-sm" style={{ color: "var(--slate)" }}>
              Optional. Verifying makes sure project updates, bids and permit news reach you, and lets you recover the account.
            </p>
            {state === "sent" ? (
              <p role="status" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--green)" }}>
                <MailCheck size={16} aria-hidden /> Check your inbox for a link from Pencil.
              </p>
            ) : (
              <button type="button" className="pa-btn mt-3" onClick={verify} disabled={state === "sending"} style={{ minHeight: 42 }}>
                {state === "sending" && <Loader2 size={15} className="animate-spin" aria-hidden />} Verify my email
              </button>
            )}
            {err && <p role="alert" className="mt-2 text-sm" style={{ color: "var(--red)" }}>{err}</p>}
          </div>
        )}
      </section>

      <section className="pa-raised p-5 sm:p-6" aria-labelledby="profile-h">
        <h2 id="profile-h" className="pa-display text-lg" style={{ color: "var(--ink)" }}>Profile</h2>
        <ActionForm action={updateProfile} submitLabel="Save" primary={false} className="mt-3 flex flex-col gap-3">
          <label className={label} style={{ color: "var(--ink)" }}>
            Your name
            <input name="full_name" className={field} defaultValue={name} autoComplete="name" />
          </label>
        </ActionForm>
        <p className="mt-4 text-xs" style={{ color: "var(--slate)" }}>Account type: {role === "gc" ? "Partner builder" : role === "admin" ? "Pencil admin" : "Client"}</p>
      </section>
    </div>
  );
}
