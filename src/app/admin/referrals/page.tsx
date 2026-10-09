import type { Metadata } from "next";
import Link from "next/link";
import PortalFrame from "@/components/portal/PortalFrame";
import ReferralRow from "@/components/portal/ReferralRow";
import { adminDb, envState, requireAdmin } from "@/lib/admin/server";
import EnvBar from "@/components/admin/EnvBar";
import { referralFeeCents, usd, type GcPartner, type Project, type Referral } from "@/lib/portal/types";

export const metadata: Metadata = { title: "Lead routing — Pencil admin" };
export const dynamic = "force-dynamic";

/** Every referral: who got the lead, the contract value, the fee owed and whether it was paid. */
export default async function ReferralsPage() {
  const viewer = await requireAdmin("/admin/referrals");
  const es = await envState();
  const db = adminDb(es.env);
  const [{ data: referrals }, { data: gcs }, { data: projects }] = await Promise.all([
    db.from("referrals").select("*").order("created_at", { ascending: false }),
    db.from("gc_partners").select("*").order("company"),
    db.from("projects").select("id, address, selected_gc_id, build_status"),
  ]);
  const rows = (referrals ?? []) as Referral[];
  const gcList = (gcs ?? []) as GcPartner[];
  const projList = (projects ?? []) as Pick<Project, "id" | "address" | "selected_gc_id" | "build_status">[];
  const owed = rows.filter((r) => r.status === "won").reduce((s, r) => s + (referralFeeCents(r) ?? 0), 0);
  const paid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + (referralFeeCents(r) ?? 0), 0);
  return (
    <PortalFrame viewer={viewer} active="/admin/referrals" wide banner={<EnvBar env={es.env} host={es.host} available={es.available} path="/admin/referrals" />}>
      <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>Lead routing</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>Route a project to builders from its page (admin panel). Record the contract and the fee here.</p>
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {([["Referrals", String(rows.length)], ["Fees owed", usd(owed)], ["Fees paid", usd(paid)]] as const).map(([k, v]) => (
          <div key={k} className="pa-inset px-3 py-3"><dd className="pa-display text-xl tabular-nums" style={{ color: "var(--ink)" }}>{v}</dd><dt className="text-[11px]" style={{ color: "var(--slate)" }}>{k}</dt></div>
        ))}
      </dl>
      {rows.length === 0 ? (
        <p className="pa-raised mt-5 p-5 text-sm" style={{ color: "var(--slate)" }}>No referrals yet.</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {rows.map((r) => {
            const proj = projList.find((p) => p.id === r.project_id);
            const gc = gcList.find((g) => g.id === r.gc_id);
            return <ReferralRow key={r.id} r={r} gc={gc?.company ?? "Builder"} address={proj?.address?.replace(/,\s*Seattle,\s*WA.*$/i, "") ?? "Lead"} />;
          })}
        </ul>
      )}
      <section className="pa-raised mt-6 p-5" aria-labelledby="gcs-h">
        <h2 id="gcs-h" className="pa-display text-lg" style={{ color: "var(--ink)" }}>Partner builders</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {gcList.map((g) => (
            <li key={g.id} className="pa-inset px-3 py-3 text-sm">
              <p className="font-semibold" style={{ color: "var(--ink)" }}>{g.company} {!g.active && <span className="text-xs" style={{ color: "var(--slate)" }}>(inactive)</span>}</p>
              <p className="text-xs" style={{ color: "var(--slate)" }}>{g.contact_name} · {g.email}{g.user_id ? " · signed in" : " · no account yet"}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--slate)" }}>Takes: {[...g.budget_tiers, ...g.areas, ...g.size_tiers].join(", ") || "anything"}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs" style={{ color: "var(--slate)" }}>Builders are added by the seed or in the Supabase table for now. <Link href="/admin/metrics" style={{ color: "var(--green)" }}>See revenue by stream</Link>.</p>
      </section>
    </PortalFrame>
  );
}
