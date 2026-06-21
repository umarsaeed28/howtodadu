"use client";

import Header from "./Header";
import Footer from "./Footer";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
