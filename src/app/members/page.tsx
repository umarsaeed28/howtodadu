import type { Metadata } from "next";
import MembersTeaser from "@/components/members/MembersTeaser";

export const metadata: Metadata = {
  title: "Lot intelligence, coming to members — Pencil",
  robots: { index: false, follow: false },
};

/** The members teaser. The proxy shows it in place of every gated page (src/lib/admin/gate.ts). */
export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const from = one(sp.from) ?? "/";
  const address = one(sp.address)?.trim().slice(0, 200) || undefined;
  return <MembersTeaser from={from} address={address} />;
}
