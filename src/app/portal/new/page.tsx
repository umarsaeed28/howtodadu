import type { Metadata } from "next";
import AcquireForm from "@/components/portal/AcquireForm";
import PortalFrame from "@/components/portal/PortalFrame";
import Stepper from "@/components/portal/Stepper";
import { requireViewer } from "@/lib/portal/server";

export const metadata: Metadata = { title: "New project — Pencil" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ address?: string }> }) {
  const { address } = await searchParams;
  const viewer = await requireViewer(`/portal/new${address ? `?address=${encodeURIComponent(address)}` : ""}`, ["client", "admin"]);
  return (
    <PortalFrame viewer={viewer} active="/portal">
      <Stepper stage="acquire" />
      <div className="mx-auto mt-6 max-w-[640px]">
        <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>Where is the DADU going?</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>The feasibility check is free. You will see buildable area, the biggest cottage the lot allows, a site plan and rough numbers.</p>
        <div className="mt-5"><AcquireForm defaultAddress={address ?? ""} /></div>
      </div>
    </PortalFrame>
  );
}
