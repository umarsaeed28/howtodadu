"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, MapPin } from "lucide-react";
import { startProjectFromLot } from "@/app/start/actions";

/** "Start your project with this lot?": yes creates the project from the last feasibility, no picks another address. */
export default function StartFromLot({ pin, address, street }: { pin: string; address: string; street: string }) {
  const [state, action, pending] = useActionState(async (_: { error?: string }, fd: FormData) => (await startProjectFromLot(fd)) ?? {}, {});
  return (
    <form action={action} className="sl">
      <input type="hidden" name="pin" value={pin} />
      <input type="hidden" name="address" value={address} />
      <p className="sl-k">Your last feasibility</p>
      <p className="sl-addr"><MapPin size={20} aria-hidden /> {street}</p>
      {pin && <p className="sl-pin">King County parcel {pin}</p>}
      <h2 className="sl-q">Is this the project you want to start?</h2>
      {state.error && <p role="alert" className="ck-err">{state.error}</p>}
      <div className="sl-ctas">
        <button type="submit" className="s-btn s-btn--primary s-btn--lg" disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
          {pending ? "Starting your project…" : "Yes, start with this lot"}
          {!pending && <ArrowRight size={16} aria-hidden />}
        </button>
        <Link href="/portal/new" className="s-btn s-btn--outline s-btn--lg">Use a different address</Link>
      </div>
    </form>
  );
}
