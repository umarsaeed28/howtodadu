"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The deal browser fills the viewport below the header; it gets no footer.
  const showFooter = pathname !== "/app";

  return (
    <div className="site">
      <Header />
      {children}
      {showFooter && <Footer />}
    </div>
  );
}
