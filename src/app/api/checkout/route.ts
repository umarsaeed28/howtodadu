import { cleanAddress, getPaymentProvider, productOf } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * Starts a checkout for one address's full report, or the five-report pack. The body carries the address, the
 * product and (mock only) a simulate flag; card details are never sent here. In mock mode this returns a receipt at once; with Stripe it will
 * return a Checkout Session URL to redirect to, and a second route will verify the session on return.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const b = (body && typeof body === "object" ? body : {}) as { address?: unknown; product?: unknown; simulate?: unknown };
  const address = cleanAddress(b.address);
  if (!address) return Response.json({ ok: false, error: "missing_address" }, { status: 422 });

  const provider = getPaymentProvider();
  const result = await provider.startCheckout({ address, product: productOf(b.product), simulate: b.simulate === "fail" ? "fail" : undefined });
  if (!result.ok) return Response.json(result, { status: result.error === "card_declined" ? 402 : 503 });
  console.log(`[checkout] ${provider.name} receipt ${result.receipt.id} (${result.receipt.product}) for ${address}`);
  return Response.json(result);
}
