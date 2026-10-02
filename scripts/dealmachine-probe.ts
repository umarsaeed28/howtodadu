/**
 * Read-only check of the DealMachine API with the key in .env.local. Uses only free endpoints (usage, filters, locations,
 * counts, cost estimates), so it spends no credits. Never prints the key.
 *   npx tsx --env-file=.env.local scripts/dealmachine-probe.ts
 */
const BASE = "https://api.v2.dealmachine.com/v1";
const key = process.env.DEALMACHINE_API_KEY;
if (!key) throw new Error("DEALMACHINE_API_KEY is not set in .env.local");

async function dm(path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json, text: text.slice(0, 600), day: res.headers.get("x-ratelimit-day-remaining") };
}

const show = (label: string, v: unknown) => console.log(`\n== ${label}\n${JSON.stringify(v, null, 1).slice(0, 2500)}`);

async function main() {
  const usage = await dm("/usage");
  show(`usage (${usage.status})`, usage.json ?? usage.text);

  const city = await dm("/locations?q=Seattle&type=city&state=WA");
  show(`Seattle city lookup (${city.status})`, city.json ?? city.text);

  const filters = await dm("/filters?source_type=properties");
  const list = ((filters.json as { data?: unknown[] })?.data ?? (filters.json as unknown[])) as Record<string, unknown>[];
  console.log(`\n== filters (${filters.status}): ${Array.isArray(list) ? list.length : "?"} returned`);
  if (Array.isArray(list)) {
    for (const f of list) {
      const id = String(f.filter_id ?? f.id ?? "");
      if (/mls|market|property_type|zon|lot_size|has_hoa|land_use/i.test(id)) {
        const opts = (f.options as Record<string, unknown>[] | undefined)?.slice(0, 40).map((o) => `${o.value ?? o.id}=${o.label ?? o.name}`);
        console.log(`${id} [${f.type}] ops=${JSON.stringify(f.allowed_operators)}${opts ? ` options: ${opts.join(" | ")}` : ""}`);
      }
    }
  } else console.log(filters.text);
  console.log(`\nrequests left today: ${usage.day ?? city.day ?? filters.day}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
