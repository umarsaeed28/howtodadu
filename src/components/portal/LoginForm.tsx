"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Mode = "signin" | "signup";

/** Sign in or create an account with an email and password. One form, two tabs, the same fields. */
export default function LoginForm({ next, initialMode = "signin" }: { next: string; initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const em = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Use a password of at least 8 characters.");
    if (mode === "signup" && !name.trim()) return setError("Tell us your name.");
    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password });
        if (error) return setError(error.message === "Invalid login credentials" ? "That email and password do not match." : error.message);
      } else {
        // No confirmation email: the server creates the account confirmed, then we sign straight in.
        const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), email: em, password }) });
        const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !j.ok) {
          if (res.status === 409) setMode("signin");
          return setError(j.error ?? "Could not create the account. Try again.");
        }
        const { error } = await supabase.auth.signInWithPassword({ email: em, password });
        if (error) return setError(error.message);
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Could not reach the sign-in service. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pa-raised p-6 sm:p-8">
      <div className="pa-inset flex p-1" role="tablist" aria-label="Sign in or create an account">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setError(null); }}
            className="flex-1 rounded-[10px] py-2 text-sm font-semibold transition-colors"
            style={mode === m ? { background: "var(--card, #fff)", color: "var(--ink)", boxShadow: "0 1px 2px rgba(23,36,29,.12)" } : { color: "var(--slate)" }}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <h1 className="pa-display mt-5 text-2xl" style={{ color: "var(--ink)" }}>{mode === "signin" ? "Welcome back" : "Start your DADU project"}</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>
        {mode === "signin" ? "Pick up where you left off." : "Feasibility first. Permit and build when you are ready."}
      </p>

      <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-3.5">
        {mode === "signup" && (
          <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--ink)" }} htmlFor={`${id}-name`}>
            Your name
            <input id={`${id}-name`} className="s-field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--ink)" }} htmlFor={`${id}-email`}>
          Email
          <input id={`${id}-email`} className="s-field" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--ink)" }} htmlFor={`${id}-pw`}>
          Password
          <input id={`${id}-pw`} className="s-field" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "At least 8 characters" : ""} />
        </label>
        {error && (
          <p role="alert" className="text-sm" style={{ color: "var(--red)" }}>{error}</p>
        )}
        <button type="submit" className="pa-btn pa-btn-primary mt-1 w-full" disabled={busy} style={{ minHeight: 46 }}>
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
          {mode === "signin" ? "Sign in" : "Create account"}
          {busy ? null : <ArrowRight size={16} aria-hidden />}
        </button>
      </form>
      <p className="mt-4 text-center text-xs" style={{ color: "var(--slate)" }}>
        {mode === "signin" ? (
          <>New to Pencil? <button type="button" className="font-semibold underline" style={{ color: "var(--green)" }} onClick={() => setMode("signup")}>Create an account</button></>
        ) : (
          <>Already have an account? <button type="button" className="font-semibold underline" style={{ color: "var(--green)" }} onClick={() => setMode("signin")}>Sign in</button></>
        )}
      </p>
    </div>
  );
}
