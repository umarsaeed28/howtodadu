import { NextRequest, NextResponse } from "next/server";
import { adminOnly } from "@/lib/admin/gate";
import { currentEnv } from "@/lib/admin/server";
import { loadAdminLotPanel } from "@/lib/server/admin-lot-panel";

export const runtime = "nodejs";

/** GET /api/admin/lot-panel?pin=0123456789: the admin side panel for one parcel (src/lib/server/admin-lot-panel.ts). */
export async function GET(request: NextRequest) {
  const denied = await adminOnly(request);
  if (denied) return denied;
  const pin = request.nextUrl.searchParams.get("pin")?.trim() ?? "";
  if (!/^\d{10}$/.test(pin)) return NextResponse.json({ error: "pin must be 10 digits" }, { status: 400 });
  const out = await loadAdminLotPanel(pin, await currentEnv());
  return out.ok ? NextResponse.json(out.panel) : NextResponse.json({ error: out.error }, { status: out.status });
}
