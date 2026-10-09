import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin/server";
import { adminConfig } from "@/lib/admin/auth";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = { title: "Admin sign in — Pencil", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The admin's own sign-in: a user name and password from the environment, not a Supabase account. */
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/admin") ? sp.next : "/admin";
  if (await currentAdmin()) redirect(next);
  const c = adminConfig();
  return (
    <main className="pencil-app">
      <div className="mx-auto max-w-[420px] px-4 py-16 md:px-6">
        <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>Admin</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>Sign in to the Pencil admin.</p>
        <div className="pa-raised mt-6 p-5">
          {c.ok ? <AdminLoginForm next={next} devDefault={c.config.devDefault} /> : <p className="text-sm" style={{ color: "var(--red)" }}>{c.error}</p>}
        </div>
      </div>
    </main>
  );
}
