/**
 * Which app tables exist on the configured Supabase project, and how many rows each has.
 *
 *   npx tsx scripts/db-status.ts
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local. Prints no secrets and no user emails.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required in .env.local");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

/** Tables by the migration that creates them. */
const TABLES: [string, string[]][] = [
  ["0005_app_data", ["rag_documents", "rag_chunks", "assessments", "token_usage", "rate_limits", "feedback", "signups", "listing_cache"]],
  ["0007_portal", ["profiles", "portal_admins", "gc_partners", "projects", "feasibility_reports", "permit_packages", "files", "design_options", "build_requests", "referrals", "bids", "activity_log"]],
  ["0009_service_orders", ["service_orders"]],
  ["0010_invest", ["invest_settings", "invest_snapshots", "watchlist"]],
  ["0011_purchases", ["purchases"]],
  ["0012_report_credits", ["report_credits", "report_pdfs", "admin_audit_log"]],
];

async function main() {
  console.log(`project host: ${new URL(url!).host}`);
  for (const [migration, tables] of TABLES) {
    const states: string[] = [];
    for (const t of tables) {
      // A real GET: PostgREST answers a HEAD on a missing table without an error, which would read as "applied".
      const { error, count } = await db.from(t).select("*", { count: "exact" }).limit(0);
      states.push(error ? `${t}: missing` : `${t}: ${count ?? 0}`);
    }
    const missing = states.filter((s) => s.endsWith("missing")).length;
    console.log(`${missing === 0 ? "applied" : missing === tables.length ? "NOT applied" : "partial"}  ${migration}`);
    console.log(`         ${states.join(", ")}`);
  }
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  console.log(`auth users: ${data?.users.length ?? 0}`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
