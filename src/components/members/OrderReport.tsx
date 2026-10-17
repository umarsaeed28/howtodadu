"use client";

import { useState } from "react";
import Link from "next/link";
import MockCheckout from "@/components/checkout/MockCheckout";
import { longDate, PRODUCTS } from "@/lib/pricing";

const parseDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Ordering a feasibility report from the members teaser. The report is not shown here: it is delivered in the
 * buyer's portal under Reports (sign up or sign in with the same email; guest orders are claimed on sign-up).
 */
export default function OrderReport({ address }: { address: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  if (done) {
    return (
      <div className="mt-order" role="status">
        <p className="mt-order-t">Your report is on its way to your portal.</p>
        <p className="s-body">Sign in with {done} and open Reports.</p>
        <Link href="/portal/reports" className="s-btn s-btn--primary" style={{ marginTop: 10 }}>Go to Reports</Link>
      </div>
    );
  }
  if (!open) {
    return (
      <div className="mt-order">
        <p className="mt-order-t">Want the answer for {address.split(",")[0]} now?</p>
        <p className="s-body">Order the feasibility report from ${Math.round(PRODUCTS.feasibility_instant.amountCents / 100)}. You read it in your portal.</p>
        <button type="button" className="s-btn" style={{ marginTop: 10 }} onClick={() => setOpen(true)}>Order the report</button>
      </div>
    );
  }
  return (
    <div className="mt-order">
      <MockCheckout
        kinds={["feasibility_instant", "feasibility_reviewed"]}
        pin={null}
        address={address}
        title={`Feasibility report for ${address.split(",")[0]}`}
        microcopy="One-time payment. Your report appears in your portal under Reports."
        successCta="Continue"
        success={(r) =>
          r.kind === "feasibility_reviewed"
            ? { title: "Thank you. Your review is booked.", body: `Expect it by ${r.dueDate ? longDate(parseDay(r.dueDate)) : "within 3 business days"}, in your portal under Reports.` }
            : { title: "Thank you. Your report is ready.", body: "It is in your portal under Reports. We emailed you the link." }
        }
        onDone={(_r, email) => setDone(email)}
      />
    </div>
  );
}
