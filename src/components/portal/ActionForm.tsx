"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Result = { error?: string } | void;

/** A form bound to a server action: pending state on the button, the action's error under it. */
export function ActionForm({ action, children, submitLabel, className, primary = true, onDone }: { action: (fd: FormData) => Promise<Result>; children: React.ReactNode; submitLabel: string; className?: string; primary?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(async (_prev: { error?: string }, fd: FormData) => {
    const r = (await action(fd)) ?? {};
    if (!r.error) {
      onDone?.();
      router.refresh();
    }
    return r;
  }, {});
  return (
    <form action={formAction} className={className ?? "flex flex-col gap-3"}>
      {children}
      {state.error && <p role="alert" className="text-sm" style={{ color: "var(--red)" }}>{state.error}</p>}
      <div>
        <button type="submit" className={`pa-btn ${primary ? "pa-btn-primary" : ""}`} disabled={pending} style={{ minHeight: 42 }}>
          {pending && <Loader2 size={15} className="animate-spin" aria-hidden />} {submitLabel}
        </button>
      </div>
    </form>
  );
}

/** A single button that runs a server action, with its spinner and error. */
export function ActionButton({ action, children, className, confirm, onDone }: { action: () => Promise<Result>; children: React.ReactNode; className?: string; confirm?: string; onDone?: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        className={className ?? "pa-btn pa-btn-primary"}
        disabled={pending}
        aria-busy={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          start(async () => {
            const r = (await action()) ?? {};
            if (r.error) setError(r.error);
            else {
              onDone?.();
              router.refresh();
            }
          });
        }}
      >
        {pending && <Loader2 size={15} className="animate-spin" aria-hidden />} {children}
      </button>
      {error && <span role="alert" className="text-xs" style={{ color: "var(--red)" }}>{error}</span>}
    </span>
  );
}

export const field = "s-field";
export const label = "flex flex-col gap-1.5 text-xs font-semibold";
