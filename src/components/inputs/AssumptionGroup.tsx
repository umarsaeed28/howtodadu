"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";

interface AssumptionGroupProps {
  title: string;
  /** Rolled-up value shown collapsed, in mono, e.g. "$182,400". */
  rolledValue: string;
  defaultOpen?: boolean;
  onReset: () => void;
  children: ReactNode;
}

/** Collapsible disclosure panel for one cost category. Collapsed by default. */
export default function AssumptionGroup({
  title,
  rolledValue,
  defaultOpen = false,
  onReset,
  children,
}: AssumptionGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="pa-card overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <ChevronDown
            size={16}
            aria-hidden
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}
          />
          <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
            {title}
          </span>
        </span>
        <span className="pa-mono text-sm" style={{ color: "var(--ink)" }}>
          {rolledValue}
        </span>
      </button>

      {open && (
        <div className="border-t px-4 pb-3 pt-1" style={{ borderColor: "var(--hairline)" }}>
          <div className="divide-y" style={{ borderColor: "var(--hairline)" }}>
            {children}
          </div>
          <button
            type="button"
            onClick={onReset}
            className="mt-2 inline-flex items-center gap-1.5 text-xs"
            style={{ color: "var(--green)" }}
          >
            <RotateCcw size={12} aria-hidden /> Reset to default
          </button>
        </div>
      )}
    </div>
  );
}
