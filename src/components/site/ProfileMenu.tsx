"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, FolderKanban, LogOut, UserRound } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Me = { name: string; email: string; role: "client" | "admin" | "gc"; verified: boolean };

const HOME: Record<Me["role"], { href: string; label: string }> = {
  client: { href: "/portal", label: "My projects" },
  admin: { href: "/admin", label: "Pipeline" },
  gc: { href: "/gc", label: "Referred projects" },
};

const initials = (s: string) => s.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

/** The header's account slot: "Sign in" for visitors; for members, their initials opening Account, projects and sign out. */
export default function ProfileMenu({ variant = "bar" }: { variant?: "bar" | "sheet" }) {
  // undefined while loading; null for visitors (and when Supabase is not configured).
  const [me, setMe] = useState<Me | null | undefined>(() => (process.env.NEXT_PUBLIC_SUPABASE_URL ? undefined : null));
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient();
    async function load() {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return setMe(null);
      const { data: p } = await supabase.from("profiles").select("full_name, role, email_verified_at").eq("id", u.id).maybeSingle();
      setMe({ name: (p?.full_name as string) || (u.user_metadata?.full_name as string) || "", email: u.email ?? "", role: (p?.role as Me["role"]) ?? "client", verified: !!p?.email_verified_at });
    }
    load().catch(() => setMe(null));
    const { data: sub } = supabase.auth.onAuthStateChange(() => void load().catch(() => setMe(null)));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (me === undefined) return <span className="pm-placeholder" aria-hidden />;
  if (!me) {
    return (
      <Link href="/login" className={`s-btn s-btn--primary${variant === "sheet" ? " s-btn--lg" : ""}`} style={variant === "sheet" ? { width: "100%" } : undefined}>
        Sign in
      </Link>
    );
  }

  const home = HOME[me.role];
  if (variant === "sheet") {
    return (
      <div className="pm-sheet">
        <p className="pm-who">{me.name || me.email}</p>
        <Link href="/portal/account" className="site-sheet-link">Account{!me.verified && <span className="pm-dot" aria-label="email not verified" />}</Link>
        <Link href={home.href} className="site-sheet-link">{home.label}</Link>
        <form action="/auth/signout" method="post"><button type="submit" className="site-sheet-link pm-signout">Sign out</button></form>
      </div>
    );
  }

  return (
    <div className="pm" ref={root}>
      <button type="button" className="pm-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} aria-label={`Account menu for ${me.name || me.email}`}>
        <span className="pm-avatar" aria-hidden>{initials(me.name || me.email)}</span>
        {!me.verified && <span className="pm-dot pm-dot--on-avatar" aria-hidden />}
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div className="pm-menu" role="menu">
          <div className="pm-head">
            <p className="pm-name">{me.name || "Your account"}</p>
            <p className="pm-email">{me.email}</p>
          </div>
          <Link role="menuitem" href="/portal/account" className="pm-item" onClick={() => setOpen(false)}>
            <UserRound size={16} aria-hidden /> Account
            {!me.verified && <span className="pm-badge">Verify email</span>}
          </Link>
          <Link role="menuitem" href={home.href} className="pm-item" onClick={() => setOpen(false)}>
            <FolderKanban size={16} aria-hidden /> {home.label}
          </Link>
          <form action="/auth/signout" method="post">
            <button role="menuitem" type="submit" className="pm-item pm-item--quiet"><LogOut size={16} aria-hidden /> Sign out</button>
          </form>
        </div>
      )}
    </div>
  );
}
