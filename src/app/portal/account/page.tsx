import type { Metadata } from "next";
import PortalFrame from "@/components/portal/PortalFrame";
import AccountPanel from "@/components/portal/AccountPanel";
import { requireViewer, userClient } from "@/lib/portal/server";

export const metadata: Metadata = { title: "Account — Pencil" };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ verified?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewer("/portal/account");
  const db = await userClient();
  const { data: p } = await db.from("profiles").select("full_name, email_verified_at").eq("id", viewer.id).maybeSingle();
  return (
    <PortalFrame viewer={viewer} active="/portal/account">
      <div className="mx-auto max-w-[640px]">
        <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>Account</h1>
        <div className="mt-5">
          <AccountPanel name={(p?.full_name as string) ?? viewer.name} email={viewer.email} role={viewer.role} verifiedAt={(p?.email_verified_at as string | null) ?? null} justVerified={sp.verified === "1"} />
        </div>
      </div>
    </PortalFrame>
  );
}
