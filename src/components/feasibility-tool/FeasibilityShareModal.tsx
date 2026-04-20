"use client";

import { useCallback, useState } from "react";
import { X, Link2, Mail, MessageSquare } from "lucide-react";

interface FeasibilityShareModalProps {
  open: boolean;
  onClose: () => void;
  /** Addresses to include in share copy (first used for link) */
  addresses: string[];
  /** Optional heading when sharing a list (e.g. favorites) */
  title?: string;
}

export function FeasibilityShareModal({
  open,
  onClose,
  addresses,
  title = "Share",
}: FeasibilityShareModalProps) {
  const [copied, setCopied] = useState(false);
  const primary = addresses[0]?.trim() ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = typeof window !== "undefined" ? window.location.pathname : "/feasibility";
  const shareLink =
    primary && origin ? `${origin}${path}?address=${encodeURIComponent(primary)}` : origin + path;

  const copy = useCallback(async () => {
    const text =
      addresses.length > 1
        ? `${shareLink}\n\nProperties:\n${addresses.map((a) => `• ${a}`).join("\n")}`
        : shareLink;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [shareLink, addresses]);

  const subject = encodeURIComponent("DADU feasibility — " + (primary || "Seattle property"));
  const multiNote =
    addresses.length > 1
      ? `\n\nSaved list (${addresses.length}):\n${addresses.map((a) => `• ${a}`).join("\n")}`
      : "";
  const body = encodeURIComponent(
    `Feasibility workspace link:\n${shareLink}${multiNote}\n\nPreliminary city data only—not a permit or legal advice.`
  );
  const mailto = `mailto:?subject=${subject}&body=${body}`;
  const sms = `sms:?&body=${encodeURIComponent(`DADU tool: ${shareLink}`)}`;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 id="share-modal-title" className="text-base font-semibold text-zinc-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--feasibility-accent,#0d9488)]"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-zinc-600">
            Recipients open a clean feasibility view for the selected property. Data is preliminary.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--feasibility-accent,#0d9488)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--feasibility-accent,#0d9488)]"
            >
              <Link2 className="size-4" aria-hidden />
              {copied ? "Copied" : "Copy link"}
            </button>
            <a
              href={mailto}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:border-[var(--feasibility-accent,#0d9488)] hover:text-[var(--feasibility-accent,#0d9488)]"
            >
              <Mail className="size-4" aria-hidden />
              Email
            </a>
            <a
              href={sms}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:border-[var(--feasibility-accent,#0d9488)] hover:text-[var(--feasibility-accent,#0d9488)]"
            >
              <MessageSquare className="size-4" aria-hidden />
              SMS
            </a>
          </div>
          <p className="break-all rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">{shareLink}</p>
        </div>
      </div>
    </div>
  );
}
