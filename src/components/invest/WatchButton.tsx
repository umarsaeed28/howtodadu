"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Heart, Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { unwatchOpportunity, watchOpportunity } from "@/app/invest/actions";

/**
 * "Add to my project": saves the opportunity to the dashboard as Watching. Signed out, it asks for a free account
 * first and comes back to the opportunity afterwards. `signedIn` undefined means unknown (a static page): the save
 * is tried and the prompt shows if it needs an account.
 */
export default function WatchButton({ listingId, signedIn, watched: initial, size = "md" }: { listingId: string; signedIn?: boolean; watched: boolean; size?: "sm" | "md" }) {
  const [watched, setWatched] = useState(initial);
  const [prompt, setPrompt] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    track("add_to_project", { listing_id: listingId, signed_in: signedIn !== false });
    if (signedIn === false) return setPrompt(true);
    setErr(null);
    start(async () => {
      const r = watched ? await unwatchOpportunity(listingId) : await watchOpportunity(listingId);
      if (r.ok) setWatched(!watched);
      else if (r.error === "sign_in") setPrompt(true);
      else setErr(r.error === "not_found" ? "This listing has left the feed." : "Could not save. Try again.");
    });
  };

  const next = `/invest/${encodeURIComponent(listingId)}`;
  return (
    <span className="iv-watch">
      <button type="button" onClick={click} aria-pressed={watched} disabled={pending} className={`pa-btn ${size === "sm" ? "pa-btn-sm" : ""}`}>
        {pending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Heart size={14} aria-hidden fill={watched ? "#C2412D" : "none"} color={watched ? "#C2412D" : "currentColor"} />}
        {watched ? "In my project" : "Add to my project"}
      </button>
      {prompt && (
        <span role="dialog" aria-label="Create an account" className="iv-watch-prompt">
          Create a free account to save opportunities.{" "}
          <Link href={`/login?mode=signup&next=${encodeURIComponent(next)}`} onClick={(e) => e.stopPropagation()}>Create account</Link>
          {" · "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} onClick={(e) => e.stopPropagation()}>Sign in</Link>
        </span>
      )}
      {err && <span role="alert" className="iv-watch-err">{err}</span>}
    </span>
  );
}
