"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import FeasAddressSearch from "./FeasAddressSearch";

export default function FeasAppBar({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (address: string) => void;
  loading: boolean;
}) {
  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{ background: "var(--card)", borderColor: "var(--hairline)" }}
    >
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3 md:flex-nowrap md:px-6">
        <Link
          href="/"
          className="pa-display shrink-0 text-lg no-underline"
          style={{ color: "var(--ink)" }}
        >
          How to DADU
        </Link>

        <form
          className="order-3 flex w-full items-center gap-2 md:order-2 md:mx-4 md:max-w-2xl md:flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(value);
          }}
        >
          <FeasAddressSearch
            value={value}
            onChange={onChange}
            onPick={(address) => onSubmit(address)}
            loading={loading}
          />
          <button type="submit" className="pa-btn pa-btn-primary" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : "Check"}
          </button>
        </form>

        <nav className="order-2 ml-auto flex items-center gap-4 md:order-3 md:ml-0">
          <Link href="/" className="text-sm no-underline" style={{ color: "var(--slate)" }}>
            Home
          </Link>
          <Link href="/faq" className="text-sm no-underline" style={{ color: "var(--slate)" }}>
            FAQ
          </Link>
        </nav>
      </div>
    </header>
  );
}
