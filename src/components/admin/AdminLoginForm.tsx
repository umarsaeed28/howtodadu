"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";

/** User name and password, with the error next to the form and a loading state on the button. */
export default function AdminLoginForm({ next, devDefault }: { next: string; devDefault: boolean }) {
  const router = useRouter();
  const id = useId();
  const [user, setUser] = useState(devDefault ? "admin" : "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user.trim() || !password) return setError("Enter the user name and password.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user, password, next }) });
      const j = (await res.json()) as { ok?: boolean; error?: string; next?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Sign-in failed.");
        setBusy(false);
        return;
      }
      router.replace(j.next ?? next);
      router.refresh();
    } catch {
      setError("Sign-in failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-describedby={error ? `${id}-err` : undefined}>
      <label htmlFor={`${id}-u`} className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
        User name
        <span className="pa-inset mt-1 flex items-center px-3" style={{ minHeight: 44 }}>
          <input id={`${id}-u`} name="user" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" autoCapitalize="none" className="w-full bg-transparent py-2 text-sm outline-none" />
        </span>
      </label>
      <label htmlFor={`${id}-p`} className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
        Password
        <span className="pa-inset mt-1 flex items-center px-3" style={{ minHeight: 44 }}>
          <input id={`${id}-p`} name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="w-full bg-transparent py-2 text-sm outline-none" />
        </span>
      </label>
      {error && <p id={`${id}-err`} role="alert" className="text-sm" style={{ color: "var(--red)" }}>{error}</p>}
      <button type="submit" className="pa-btn pa-btn-primary" disabled={busy} aria-busy={busy}>
        {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <LogIn size={15} aria-hidden />} Sign in
      </button>
      {devDefault && <p className="text-xs" style={{ color: "var(--slate)" }}>Development: the default credentials are in use. Set ADMIN_USER, ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET before deploying.</p>}
    </form>
  );
}
