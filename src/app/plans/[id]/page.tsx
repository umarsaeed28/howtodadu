import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Container, Section } from "@/components/ui";
import { PREAPPROVED_PLANS } from "@/lib/preapproved-dadus";
import { Footprint, familyName } from "@/components/home/PlanCards";
import PlanDetail from "@/components/plans/PlanDetail";

const variantsOf = (family: string) => PREAPPROVED_PLANS.filter((p) => p.family === family);

export function generateStaticParams() {
  return [...new Set(PREAPPROVED_PLANS.map((p) => p.family))].map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const vs = variantsOf((await params).id);
  if (!vs.length) return { title: "Plan — Pencil" };
  return { title: `${familyName(vs[0])} by ${vs[0].designer} — Pencil`, description: `A City of Seattle pre-approved DADU design. ${vs[0].note}` };
}

/** One pre-approved design: what it is, who drew it, its approved sizes, and the way to see it on your lot and request it. */
export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const vs = variantsOf((await params).id);
  if (!vs.length) notFound();
  const p = vs[0];
  const fee = vs[0].licenseFee;
  return (
    <main>
      <Section style={{ paddingBlock: "clamp(1.5rem, 4vw, 3rem) clamp(3rem, 6vw, 5rem)" }}>
        <Container style={{ maxWidth: 1080 }}>
          <Link href="/plans" className="pl-back"><ArrowLeft size={15} aria-hidden /> All city-reviewed plans</Link>
          <div className="pd-head">
            <div className="pd-art">{p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt={`${familyName(p)} by ${p.designer}`} />
            ) : <Footprint p={p} size={140} />}</div>
            <div className="min-w-0">
              <p className="pd-firm">{p.designer}</p>
              <h1 className="pd-title">{familyName(p)}</h1>
              <p className="pd-lede">{p.note}</p>
              <ul className="pd-facts">
                <li><strong>{Math.min(...vs.map((v) => v.sqft)).toLocaleString()}{vs.length > 1 ? `–${Math.max(...vs.map((v) => v.sqft)).toLocaleString()}` : ""} sf</strong> living area</li>
                <li><strong>{[...new Set(vs.map((v) => v.beds))].join(", ")}</strong> bed · <strong>{[...new Set(vs.map((v) => v.baths))].join(", ")}</strong> bath</li>
                <li><strong>{[...new Set(vs.map((v) => v.stories))].join(" or ")}</strong> {vs.every((v) => v.stories === 1) ? "story" : "stories"}</li>
                <li>Plan license from the firm: <strong>${fee.toLocaleString()}</strong></li>
              </ul>
              <p className="pd-links">
                <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer"><FileText size={15} aria-hidden /> City plan set (PDF)</a>
              </p>
            </div>
          </div>
          <Suspense>
            <PlanDetail variants={vs} />
          </Suspense>
        </Container>
      </Section>
    </main>
  );
}
