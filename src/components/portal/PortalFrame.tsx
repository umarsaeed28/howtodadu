import Link from "next/link";
import { LogOut } from "lucide-react";
import type { Viewer } from "@/lib/portal/server";

const ACCOUNT = { href: "/portal/account", label: "Account" };
const LINKS: Record<Viewer["role"], { href: string; label: string }[]> = {
  client: [{ href: "/dashboard", label: "Your properties" }, { href: "/portal/reports", label: "Reports" }, ACCOUNT],
  admin: [
    { href: "/admin", label: "Pipeline" },
    { href: "/admin/map", label: "Map" },
    { href: "/admin/feasibility", label: "Feasibility" },
    { href: "/admin/plans", label: "Plans" },
    { href: "/admin/referrals", label: "Lead routing" },
    { href: "/admin/metrics", label: "Metrics" },
    { href: "/admin/revenue", label: "Revenue" },
    { href: "/admin/invest", label: "Invest" },
  ],
  gc: [{ href: "/gc", label: "Referred projects" }, ACCOUNT],
};

/** The portal's own bar under the site header: role links, who is signed in, sign out. Pages sit in a narrow column. */
export default function PortalFrame({ viewer, active, children, wide, banner }: { viewer: Viewer; active: string; children: React.ReactNode; wide?: boolean; banner?: React.ReactNode }) {
  return (
    <main className="pencil-app">
      <div className="border-b" style={{ borderColor: "var(--hairline)", background: "var(--paper)" }}>
        <div className={`mx-auto flex items-center gap-1 px-4 md:px-6 ${wide ? "max-w-[1400px]" : "max-w-[1040px]"}`}>
          <nav className="pa-scroll flex min-w-0 flex-1 gap-1 overflow-x-auto py-1.5" aria-label="Portal">
            {LINKS[viewer.role].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold no-underline"
                style={active === l.href ? { background: "var(--green-tint)", color: "var(--green)" } : { color: "var(--ink)" }}
                aria-current={active === l.href ? "page" : undefined}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <span className="hidden truncate text-xs sm:inline" style={{ color: "var(--slate)" }}>
            {viewer.name || viewer.email}
            {viewer.role !== "client" && <span className="ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ background: "var(--green-tint)", color: "var(--green)" }}>{viewer.role}</span>}
          </span>
          <form action={viewer.role === "admin" ? "/api/admin/logout" : "/auth/signout"} method="post">
            <button type="submit" className="pa-btn pa-btn-sm" aria-label="Sign out"><LogOut size={14} aria-hidden /> <span className="hidden sm:inline">Sign out</span></button>
          </form>
        </div>
      </div>
      <div className={`mx-auto px-4 pb-16 pt-6 md:px-6 ${wide ? "max-w-[1400px]" : "max-w-[1040px]"}`}>
        {banner && <div className="mb-5">{banner}</div>}
        {children}
      </div>
    </main>
  );
}
