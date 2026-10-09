"use client";

import MockCheckout from "@/components/checkout/MockCheckout";
import type { Receipt } from "@/lib/payments";
import type { ProductKind } from "@/lib/pricing";
import { longDate } from "@/lib/pricing";
import { track } from "@/lib/analytics";

const parseDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/**
 * The paywall over the blurred report: the instant report ($200) or the architect-reviewed one ($600).
 * Both open the full report at once; the reviewed tier also puts the lot in an architect's queue.
 */
export default function ReportPaywall({ pin, address, defaultTier, onUnlock }: { pin: string | null; address: string; defaultTier?: ProductKind; onUnlock: (r: Receipt, email: string) => void }) {
  return (
    <div className="ck-shell">
      <MockCheckout
        kinds={["feasibility_instant", "feasibility_reviewed"]}
        defaultKind={defaultTier}
        pin={pin}
        address={address}
        title="Unlock your lot's full potential"
        microcopy="One-time payment. Yours to keep and share with your builder."
        successCta="Open my report"
        success={(r) =>
          r.kind === "feasibility_reviewed"
            ? { title: "Thank you. Your review is booked.", body: `Your lot is in a designer's hands. Expect your review by ${r.dueDate ? longDate(parseDay(r.dueDate)) : "within 3 business days"}.` }
            : { title: "Thank you. Your report is ready.", body: "We emailed you a link to it, so you can come back any time." }
        }
        onDone={(r, email) => {
          track("report_purchased", { tier: r.kind });
          onUnlock(r, email);
        }}
      />
    </div>
  );
}
