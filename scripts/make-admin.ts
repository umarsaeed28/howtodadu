/**
 * Make an existing account a portal admin.
 *
 *   npx tsx scripts/make-admin.ts you@example.com
 *
 * Adds the email to portal_admins (so it stays an admin if it ever signs up again) and sets the profile's role
 * to admin now. Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local. Prints no secrets.
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
const email = (process.argv[2] ?? process.env.PORTAL_ADMIN_EMAIL ?? "").trim().toLowerCase();
if (!email.includes("@")) throw new Error("Usage: npx tsx scripts/make-admin.ts you@example.com");

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { error: e1 } = await db.from("portal_admins").upsert({ email });
  if (e1) throw new Error(`portal_admins: ${e1.message}`);
  // An account that signed up before migration 0007 has no profile row (the trigger did not exist yet): create it.
  const { data: list, error: e0 } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (e0) throw new Error(`auth: ${e0.message}`);
  const user = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
  if (!user) {
    console.log(`${email} is listed in portal_admins, but no account with that email exists yet: it becomes an admin when it signs up.`);
    return;
  }
  const { error: e2 } = await db.from("profiles").upsert({ id: user.id, email, full_name: (user.user_metadata?.full_name as string | undefined) ?? "", role: "admin" }, { onConflict: "id" });
  if (e2) throw new Error(`profiles: ${e2.message}`);
  console.log(`${email} is now an admin. Reload /admin (sign out and back in if it still redirects).`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
