"use client";

import AddressAutocomplete from "@/components/search/AddressAutocomplete";

/** The feasibility page's address box: the shared Seattle autocomplete in the tool pages' inset style. */
export default function FeasAddressSearch({
  value,
  onChange,
  onPick,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Fired when the user commits an address (suggestion, recent, or raw Enter). */
  onPick: (address: string) => void;
  loading: boolean;
}) {
  return (
    <div className="relative flex-1">
      <AddressAutocomplete value={value} onChange={onChange} onPick={onPick} loading={loading} label="Seattle address" placeholder="Enter a Seattle address" variant="app" />
    </div>
  );
}
