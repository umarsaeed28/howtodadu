"use client";

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
    <div
      className="sticky z-20 border-b"
      style={{ top: "var(--nav-h)", background: "var(--card)", borderColor: "var(--hairline)" }}
    >
      <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3 md:px-6">
        <p className="pa-eyebrow shrink-0" style={{ color: "var(--slate)" }}>
          Check a property
        </p>
        <form
          className="flex w-full items-center gap-2 md:mx-2 md:max-w-2xl md:flex-1"
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
      </div>
    </div>
  );
}
