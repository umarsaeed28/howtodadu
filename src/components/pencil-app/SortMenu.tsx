"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useAppStore, type SortKey } from "@/lib/store";

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: "margin", label: "Highest margin" },
  { key: "units", label: "Most units" },
  { key: "newest", label: "Newest listing" },
  { key: "price", label: "Lowest price" },
];

export default function SortMenu() {
  const sort = useAppStore((s) => s.sort);
  const setSort = useAppStore((s) => s.setSort);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = OPTIONS.find((o) => o.key === sort)?.label;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="pa-btn pa-btn-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ color: "var(--slate)" }}>Sort:</span> {current}
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Sort results"
          className="pa-card absolute right-0 z-40 mt-2 w-48 overflow-hidden p-1"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          {OPTIONS.map((o) => (
            <li key={o.key}>
              <button
                type="button"
                role="option"
                aria-selected={o.key === sort}
                className="flex w-full items-center justify-between rounded-[5px] px-2.5 py-2 text-left text-sm hover:bg-[var(--paper)]"
                onClick={() => {
                  setSort(o.key);
                  setOpen(false);
                }}
              >
                {o.label}
                {o.key === sort && (
                  <Check size={15} aria-hidden style={{ color: "var(--green)" }} />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
