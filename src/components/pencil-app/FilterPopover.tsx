"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function FilterPopover({
  label,
  summary,
  active,
  children,
  align = "left",
  width = 280,
}: {
  label: string;
  summary?: string | null;
  active?: boolean;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={`pa-chip ${active ? "pa-chip-active" : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        {active && summary ? <span className="pa-mono">{summary}</span> : label}
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className="pa-card absolute z-40 mt-2 p-4"
          style={{
            width,
            [align]: 0,
            boxShadow: "var(--shadow-pop)",
          }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
