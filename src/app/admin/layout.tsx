import type { Metadata } from "next";

/** The admin is never indexed. Access is checked per request in src/proxy.ts and by requireAdmin() on each page. */
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
