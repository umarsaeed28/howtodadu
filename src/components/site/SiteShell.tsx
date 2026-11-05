"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The map views fill the viewport below the header; they get no footer.
  const showFooter = pathname !== "/";

  return (
    <div className="site">
      <Header />
      {children}
      {showFooter && <Footer />}
    </div>
  );
}
