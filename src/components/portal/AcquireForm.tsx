"use client";

import { useState } from "react";
import { Home, Search } from "lucide-react";
import { createProject } from "@/app/portal/actions";
import { ActionForm, field, label } from "./ActionForm";

/** Stage 1. Either the client owns the property, or they ask Pencil to find a lot (a brokerage lead). */
export default function AcquireForm() {
  const [mode, setMode] = useState<"own" | "help">("own");
  return (
    <div className="pa-raised p-5 sm:p-6">
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="How you are starting">
        {([
          ["own", Home, "I own the property"],
          ["help", Search, "Help me find a lot"],
        ] as const).map(([m, Icon, text]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className="flex items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold"
            style={mode === m ? { background: "var(--green-tint)", color: "var(--green)", boxShadow: "inset 0 0 0 1.5px var(--green)" } : { background: "var(--bg, #F3F5F2)", color: "var(--ink)" }}
          >
            <Icon size={16} aria-hidden /> {text}
          </button>
        ))}
      </div>
      <ActionForm action={createProject} submitLabel={mode === "own" ? "Pull the parcel" : "Send the request"} className="mt-5 flex flex-col gap-3">
        <input type="hidden" name="mode" value={mode} />
        {mode === "own" ? (
          <label className={label} style={{ color: "var(--ink)" }}>
            Property address
            <input name="address" className={field} placeholder="610 N 125th St, Seattle" autoComplete="street-address" autoFocus required />
            <span className="font-normal" style={{ color: "var(--slate)" }}>Seattle only. We pull the parcel, zoning, lot shape and site data from the city and county.</span>
          </label>
        ) : (
          <label className={label} style={{ color: "var(--ink)" }}>
            What are you looking for?
            <textarea name="notes" className={field} rows={4} style={{ padding: "0.75rem 1.1rem" }} placeholder="Budget, neighborhoods, timing, whether you plan to live there…" autoFocus />
            <span className="font-normal" style={{ color: "var(--slate)" }}>Pencil will shortlist lots that take a DADU and get back to you.</span>
          </label>
        )}
      </ActionForm>
    </div>
  );
}
