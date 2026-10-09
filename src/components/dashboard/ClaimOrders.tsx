"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Sends this browser's order tokens once, so purchases made before signing in show up here. */
export default function ClaimOrders() {
  const router = useRouter();
  useEffect(() => {
    let orders: { orderId: string; token: string }[] = [];
    try {
      const raw = window.localStorage.getItem("pencil.orders.v1");
      orders = raw ? (JSON.parse(raw) as { orderId: string; token: string }[]).map((o) => ({ orderId: o.orderId, token: o.token })) : [];
    } catch {
      return;
    }
    if (!orders.length) return;
    fetch("/api/orders/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orders }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { claimed?: number } | null) => {
        if (j?.claimed) router.refresh();
      })
      .catch(() => {});
  }, [router]);
  return null;
}
