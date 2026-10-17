"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The map fills the viewport below the header; it gets no footer (nor do the admin map and feasibility workspaces).
  const showFooter = pathname !== "/search" && pathname !== "/admin/map" && pathname !== "/admin/feasibility";

  return (
    <div className="site">
      <Header />
      {children}
      {showFooter && <Footer />}
    </div>
  );
}
