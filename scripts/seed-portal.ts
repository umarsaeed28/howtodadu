/**
 * Seeds the client portal: the admin email, two partner builders, a demo client, and three sample projects
 * (one each at feasibility, permit and build). Idempotent: re-running updates the same rows.
 *
 *   npx tsx scripts/seed-portal.ts
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local, and migration 0007 applied.
 * PORTAL_ADMIN_EMAIL (default below) becomes an admin when that address signs up.
 * Demo sign-ins (local and staging only; change or delete them before real clients arrive):
 *   client: demo-client@pencil.test   builder: demo-builder@pencil.test   password for both: DEMO_PASSWORD below
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const ADMIN_EMAIL = process.env.PORTAL_ADMIN_EMAIL ?? "umarsaeed28@gmail.com";
const DEMO_PASSWORD = "pencil-demo-2026";
const CLIENT = { email: "demo-client@pencil.test", name: "Demo Client" };
const BUILDER = { email: "demo-builder@pencil.test", name: "Sam Carpenter" };

async function ensureUser(email: string, name: string): Promise<string> {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { full_name: name } });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return data.user.id;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

async function main() {
  await db.from("portal_admins").upsert({ email: ADMIN_EMAIL.toLowerCase() });

  // Builders first, so the demo builder's sign-up gets the gc role from the trigger.
  const { data: gcRows, error: gcErr } = await db
    .from("gc_partners")
    .upsert(
      [
        { email: BUILDER.email, company: "Northgate Cottage Co.", contact_name: BUILDER.name, phone: "206-555-0101", budget_tiers: ["250k_400k", "over_400k"], areas: ["north", "central"], size_tiers: ["medium", "large"] },
        { email: "bids@rainier-backyard.test", company: "Rainier Backyard Builders", contact_name: "Dana Ruiz", phone: "206-555-0102", budget_tiers: ["under_250k", "250k_400k"], areas: ["south", "central", "west"], size_tiers: ["small", "medium"] },
      ],
      { onConflict: "email" },
    )
    .select("id, email");
  if (gcErr) throw gcErr;
  const gc1 = gcRows!.find((g) => g.email === BUILDER.email)!.id;
  const gc2 = gcRows!.find((g) => g.email !== BUILDER.email)!.id;

  const clientId = await ensureUser(CLIENT.email, CLIENT.name);
  const builderId = await ensureUser(BUILDER.email, BUILDER.name);
  await db.from("profiles").upsert([{ id: clientId, email: CLIENT.email, full_name: CLIENT.name, role: "client" }, { id: builderId, email: BUILDER.email, full_name: BUILDER.name, role: "gc" }]);
  await db.from("gc_partners").update({ user_id: builderId }).eq("id", gc1);

  // Start clean for the demo client so the three projects are exactly these.
  await db.from("projects").delete().eq("owner_id", clientId);

  const samples = [
    { address: "610 N 125th St, Seattle, WA", parcel_id: "0004000070", stage: "feasibility", created: 3, score: 86, verdict: "Feasible", maxDadu: 1000, buildable: 1460, lotSqft: 7200, zoning: "NR3" },
    { address: "3504 NE 93rd St, Seattle, WA", parcel_id: "8080400290", stage: "permit", created: 48, score: 79, verdict: "Feasible", maxDadu: 900, buildable: 1120, lotSqft: 6100, zoning: "NR2" },
    { address: "522 NE 127th St, Seattle, WA", parcel_id: "1972200040", stage: "build", created: 140, score: 74, verdict: "Conditional", maxDadu: 820, buildable: 980, lotSqft: 5800, zoning: "NR3" },
  ] as const;

  const ids: string[] = [];
  for (const s of samples) {
    const { data: p, error } = await db
      .from("projects")
      .insert({ owner_id: clientId, address: s.address, parcel_id: s.parcel_id, stage: s.stage, created_at: daysAgo(s.created), updated_at: daysAgo(1), latest_update: "Seeded sample project" })
      .select("id")
      .single();
    if (error || !p) throw error ?? new Error("insert project");
    ids.push(p.id);
    const summary = {
      pin: s.parcel_id, score: s.score, verdict: s.verdict, headline: `A ${s.maxDadu} sf backyard cottage fits with room to spare.`, maxDaduSf: s.maxDadu, buildableAreaSf: s.buildable, lotSqft: s.lotSqft, zoning: s.zoning,
      coveragePct: 22, maxCoveragePct: 35, heightFt: 18, rearSetbackFt: 5, sideSetbackFt: 5, parking: "None required for a DADU in Seattle", costUsd: s.maxDadu * 350 + 50_000, rentMonthly: 2500, saleValueUsd: Math.round(s.maxDadu * (s.maxDadu >= 1000 ? 680 : 800 - ((s.maxDadu - 800) / 200) * 120)),
    };
    await db.from("feasibility_reports").insert({ project_id: p.id, score: s.score, verdict: s.verdict, max_dadu_sf: s.maxDadu, buildable_area_sf: s.buildable, summary, created_at: daysAgo(s.created - 1) });
    await db.from("activity_log").insert([
      { project_id: p.id, actor_id: clientId, kind: "note", message: `Project started for ${s.address}`, created_at: daysAgo(s.created) },
      { project_id: p.id, actor_id: clientId, kind: "stage_change", message: `Parcel pulled; feasibility scored ${s.score} (${s.verdict})`, meta: { from: "acquire", to: "feasibility" }, created_at: daysAgo(s.created - 1) },
    ]);
  }

  // Project 2: paid permit package, one correction round, a design approved.
  const [, permitId, buildId] = ids;
  await db.from("permit_packages").insert({ project_id: permitId, status: "corrections", fee_cents: 1_500_000, payment_id: "seed_pi_demo", paid_at: daysAgo(40), correction_rounds: 1, submitted_at: daysAgo(12), created_at: daysAgo(40) });
  await db.from("design_options").insert([
    { project_id: permitId, title: "Option A: one story, 2 bed", description: "Gable roof, covered porch facing the garden, 900 sf.", status: "approved", decided_at: daysAgo(30), created_at: daysAgo(34) },
    { project_id: permitId, title: "Option B: loft studio", description: "Shed roof with a sleeping loft, 760 sf.", status: "rejected", decided_at: daysAgo(30), created_at: daysAgo(34) },
  ]);
  await db.from("activity_log").insert([
    { project_id: permitId, actor_id: clientId, kind: "payment", message: "Permit package paid; kickoff scheduled", created_at: daysAgo(40) },
    { project_id: permitId, actor_id: clientId, kind: "stage_change", message: "Moved to Architecture & permit", meta: { from: "feasibility", to: "permit" }, created_at: daysAgo(40) },
    { project_id: permitId, actor_id: clientId, kind: "approval", message: "Approved design option “Option A: one story, 2 bed”", created_at: daysAgo(30) },
    { project_id: permitId, actor_id: null, kind: "status_change", message: "Permit: Submitted", meta: { to: "submitted" }, created_at: daysAgo(12) },
    { project_id: permitId, actor_id: null, kind: "status_change", message: "Permit: Corrections (round 1)", meta: { to: "corrections" }, created_at: daysAgo(3) },
  ]);
  await db.from("projects").update({ latest_update: "Permit: Corrections (round 1)" }).eq("id", permitId);

  // Project 3: approved permit, two bids, builder chosen, framing underway.
  await db.from("permit_packages").insert({ project_id: buildId, status: "approved", fee_cents: 1_500_000, payment_id: "seed_pi_demo_2", paid_at: daysAgo(130), correction_rounds: 2, submitted_at: daysAgo(100), approved_at: daysAgo(60), created_at: daysAgo(130) });
  await db.from("build_requests").insert({ project_id: buildId, budget_tier: "250k_400k", timeline: "This spring", finishes: "Standard", financing: "HELOC", area: "north", size_tier: "medium", disclosure_ack_at: daysAgo(58), created_at: daysAgo(58) });
  await db.from("referrals").insert([
    { project_id: buildId, gc_id: gc1, agreement_note: "Signed referral agreement, 5% of contract", fee_type: "percent", fee_value: 5, contract_value_cents: 31_800_000, status: "won", created_at: daysAgo(56) },
    { project_id: buildId, gc_id: gc2, agreement_note: "Signed referral agreement, 5% of contract", fee_type: "percent", fee_value: 5, status: "lost", created_at: daysAgo(56) },
  ]);
  await db.from("bids").insert([
    { project_id: buildId, gc_id: gc1, amount_cents: 31_800_000, timeline_weeks: 26, notes: "Includes site work and utilities; standard finish allowance.", status: "selected", created_at: daysAgo(50) },
    { project_id: buildId, gc_id: gc2, amount_cents: 29_900_000, timeline_weeks: 32, notes: "Excludes sewer tie-in.", status: "declined", created_at: daysAgo(49) },
  ]);
  await db.from("projects").update({ selected_gc_id: gc1, build_status: "framing", latest_update: "Build: Framing" }).eq("id", buildId);
  await db.from("activity_log").insert([
    { project_id: buildId, actor_id: clientId, kind: "stage_change", message: "Moved to Architecture & permit", meta: { from: "feasibility", to: "permit" }, created_at: daysAgo(130) },
    { project_id: buildId, actor_id: null, kind: "status_change", message: "Permit: Approved", meta: { to: "approved" }, created_at: daysAgo(60) },
    { project_id: buildId, actor_id: clientId, kind: "stage_change", message: "Moved to Build: quote requested", meta: { from: "permit", to: "build" }, created_at: daysAgo(58) },
    { project_id: buildId, actor_id: builderId, kind: "bid", message: "Bid received: $318,000 over 26 weeks", created_at: daysAgo(50) },
    { project_id: buildId, actor_id: clientId, kind: "bid", message: "Builder selected; contract next", created_at: daysAgo(45) },
    { project_id: buildId, actor_id: builderId, kind: "status_change", message: "Build: Framing", meta: { to: "framing" }, created_at: daysAgo(4) },
  ]);

  console.log(`Seeded: admin ${ADMIN_EMAIL}, client ${CLIENT.email}, builder ${BUILDER.email}, 3 projects.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
