import { REPORT_PRICE_CENTS, cleanAddress, getPaymentProvider } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * Starts a checkout for one address's full report. The body carries the address and nothing else:
 * card details are never sent here. In mock mode this returns a receipt at once; with Stripe it will
 * return a Checkout Session URL to redirect to, and a second route will verify the session on return.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const address = cleanAddress(body && typeof body === "object" ? (body as { address?: unknown }).address : "");
  if (!address) return Response.json({ ok: false, error: "missing_address" }, { status: 422 });

  const provider = getPaymentProvider();
  const result = await provider.startCheckout({ address, amountCents: REPORT_PRICE_CENTS });
  if (!result.ok) return Response.json(result, { status: 503 });
  console.log(`[checkout] ${provider.name} receipt ${result.receipt.id} for ${address}`);
  return Response.json(result);
}
