"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getParcel } from "@/lib/parcels";
import ParcelCard from "./ParcelCard";

const NOTES_KEY = "pencil-app.notes.v1";

function loadNotes(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function SavedView() {
  const saved = useAppStore((s) => s.saved);
  const [mounted, setMounted] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    setNotes(loadNotes());
  }, []);

  function setNote(id: string, value: string) {
    setNotes((prev) => {
      const next = { ...prev, [id]: value };
      try {
        localStorage.setItem(NOTES_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  }

  if (!mounted) return null;

  const items = saved.map(getParcel).filter(Boolean);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <span
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "var(--green-tint)", color: "var(--green)" }}
        >
          <Search size={22} aria-hidden />
        </span>
        <h1 className="pa-display text-lg">No saved parcels yet</h1>
        <p className="mt-1 max-w-xs text-sm" style={{ color: "var(--slate)" }}>
          Tap the heart on any parcel to keep it here with your notes.
        </p>
        <Link href="/app" className="pa-btn pa-btn-primary mt-4">
          Start a search
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <div key={p!.id} className="space-y-2">
          <ParcelCard parcel={p!} />
          <label className="sr-only" htmlFor={`note-${p!.id}`}>
            Notes for {p!.address}
          </label>
          <textarea
            id={`note-${p!.id}`}
            value={notes[p!.id] ?? ""}
            onChange={(e) => setNote(p!.id, e.target.value)}
            placeholder="Add a note — broker, financing idea, next step…"
            rows={2}
            className="w-full resize-none rounded-[6px] border bg-[var(--card)] px-3 py-2 text-sm"
            style={{ borderColor: "var(--hairline)" }}
          />
        </div>
      ))}
    </div>
  );
}
