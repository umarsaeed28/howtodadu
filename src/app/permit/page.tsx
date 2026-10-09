import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Container, Heading, Lede, Section } from "@/components/ui";
import { Tracker } from "@/components/portal/Stepper";
import PermitFlow from "@/components/permit/PermitFlow";
import { currentViewer, userClient } from "@/lib/portal/server";
import { PERMIT_PACKAGE, PERMIT_TRACKER, PERMIT_TRACKER_LABELS, permitTrackerStep, type PermitPackage, type Project } from "@/lib/portal/types";
import { PRODUCTS, price } from "@/lib/pricing";
import { prettyAddress } from "@/lib/parcel-context";

export const metadata: Metadata = {
  title: "Permit service — Pencil",
  description: "From submission to issued permit, Pencil deals with SDCI so you don't have to. One fixed fee.",
};
export const dynamic = "force-dynamic";

/** Projects this viewer already has in the permit service, each with the four-step tracker. Empty when there are none or the tables are not there yet. */
async function myPermits(): Promise<{ project: Project; pkg: PermitPackage }[]> {
  try {
    const db = await userClient();
    const { data: pkgs } = await db.from("permit_packages").select("*").not("paid_at", "is", null);
    if (!pkgs?.length) return [];
    const { data: projects } = await db.from("projects").select("*").in("id", pkgs.map((p) => p.project_id));
    return (pkgs as PermitPackage[]).map((pkg) => ({ pkg, project: (projects as Project[] | null)?.find((p) => p.id === pkg.project_id) })).filter((x): x is { pkg: PermitPackage; project: Project } => !!x.project);
  } catch {
    return [];
  }
}

export default async function PermitPage({ searchParams }: { searchParams: Promise<{ parcel?: string }> }) {
  const sp = await searchParams;
  const viewer = await currentViewer().catch(() => null);
  const permits = viewer ? await myPermits() : [];
  const next = `/permit${sp.parcel ? `?parcel=${sp.parcel}` : ""}`;
  return (
    <main>
      <Section style={{ paddingBlock: "clamp(2rem, 5vw, 3.5rem) clamp(3rem, 6vw, 5rem)" }}>
        <Container style={{ maxWidth: 980 }}>
          <Heading level={1} style={{ fontSize: "clamp(2.2rem, 4.6vw, 3.6rem)", maxWidth: "18ch" }}>We handle the permit. You plan the housewarming.</Heading>
          <Lede style={{ marginTop: 14 }}>From submission to issued permit, we deal with SDCI so you don&apos;t have to.</Lede>

          {permits.length > 0 && (
            <section className="pt-list" aria-labelledby="pt-h">
              <h2 id="pt-h" className="pd-h2">Your permits</h2>
              <ul>
                {permits.map(({ project, pkg }) => {
                  const step = permitTrackerStep(pkg.status);
                  return (
                    <li key={project.id} className="pt-item">
                      <div className="pt-top">
                        <p className="pt-addr">{prettyAddress(project.address ?? "Your project")}</p>
                        {pkg.correction_rounds > 0 && step !== "issued" && <span className="pt-rounds">{pkg.correction_rounds} correction {pkg.correction_rounds === 1 ? "round" : "rounds"}</span>}
                      </div>
                      <Tracker steps={PERMIT_TRACKER} labels={PERMIT_TRACKER_LABELS} current={step} />
                      {step === "issued" ? <p className="pt-issued"><Check size={16} strokeWidth={3} aria-hidden /> Permit issued. Time to build.</p> : <p className="cs-hint">{project.latest_update || "We email you at every step."}</p>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <div className="pt-grid">
            <section className="pt-what" aria-labelledby="pt-what-h">
              <h2 id="pt-what-h" className="pd-h2">{PRODUCTS.permit.name}, {price(PRODUCTS.permit.amountCents)}</h2>
              <ul className="pt-incl">
                {PERMIT_PACKAGE.includes.map((x) => <li key={x}><Check size={16} strokeWidth={3} aria-hidden /> {x}</li>)}
              </ul>
              <p className="cs-hint">{PERMIT_PACKAGE.timeline} We never promise an approval date; we keep you posted at every step.</p>
            </section>
            <section className="pt-start" aria-label="Start a permit">
              {viewer ? (
                <Suspense>
                  <PermitFlow email={viewer.email} />
                </Suspense>
              ) : (
                <div className="pd-req">
                  <h2 className="pd-h2">Sign in to start</h2>
                  <p className="pd-sub">Your plans and the city&apos;s letters stay private to your account, so the permit service needs one. It takes a minute.</p>
                  <div className="rn-ctas">
                    <Link href={`/login?mode=signup&next=${encodeURIComponent(next)}`} className="s-btn s-btn--primary">Create an account <ArrowRight size={15} aria-hidden /></Link>
                    <Link href={`/login?next=${encodeURIComponent(next)}`} className="s-btn s-btn--outline">Sign in</Link>
                  </div>
                </div>
              )}
            </section>
          </div>
        </Container>
      </Section>
    </main>
  );
}
