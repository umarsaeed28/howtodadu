import Link from "next/link";
import { Container, Heading, Lede } from "@/components/ui";
import NewsletterField from "@/components/site/NewsletterField";
import OrderReport from "./OrderReport";

/**
 * What the public sees instead of the map, the feasibility tool, listing and invest pages (src/lib/admin/gate.ts).
 * Static on purpose: the preview is a drawing, not data, and nothing here calls a lot API, so no lot intelligence
 * reaches the HTML or the network. The address a visitor typed comes along to prefill the sign-up, and a visitor who
 * came to check a lot can still order the report; it is delivered in their portal under Reports.
 */
export default function MembersTeaser({ from, address }: { from: string; address?: string }) {
  const orderable = from.startsWith("/feasibility") && !!address;
  return (
    <section className="mt-wrap" aria-labelledby="mt-h">
      <div className="mt-preview" aria-hidden>
        <PreviewDrawing />
      </div>
      <Container className="mt-body">
        <div className="s-card mt-card">
          <Heading level={1} id="mt-h" style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)" }}>Lot intelligence, coming to members</Heading>
          <Lede style={{ marginTop: 10 }}>Join the list and we&apos;ll tell you when it opens.</Lede>
          <div style={{ marginTop: 18 }}>
            <NewsletterField label="Join the list" placeholder="you@email.com" address={address ?? ""} />
          </div>
          {orderable && <OrderReport address={address!} />}
          <p className="mt-fine">
            Already ordered a report? <Link href="/portal/reports">Open it in your portal</Link>.
          </p>
        </div>
      </Container>
    </section>
  );
}

/** A stand-in for the map and plan view: streets, lots and score dots drawn by hand. It shows no real place. */
function PreviewDrawing() {
  const dots = [
    [120, 90, "#145A40"], [260, 150, "#6CB98A"], [410, 80, "#145A40"], [560, 200, "#D9A441"], [700, 120, "#6CB98A"],
    [180, 300, "#6CB98A"], [340, 360, "#145A40"], [520, 330, "#B8B2A4"], [660, 400, "#145A40"], [820, 300, "#6CB98A"],
    [90, 470, "#D9A441"], [300, 520, "#6CB98A"], [480, 480, "#145A40"], [760, 520, "#6CB98A"], [900, 440, "#145A40"],
  ] as const;
  return (
    <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" role="presentation">
      <rect width="1000" height="600" fill="#EEF1EF" />
      {[0, 1, 2, 3, 4].map((r) =>
        [0, 1, 2, 3, 4, 5].map((c) => <rect key={`${r}-${c}`} x={20 + c * 165} y={20 + r * 118} width={145} height={98} rx={6} fill="#FFFFFF" stroke="rgba(17,22,20,0.1)" />)
      )}
      {dots.map(([x, y, fill], i) => <circle key={i} cx={x} cy={y} r={14} fill={fill} stroke="#FFFFFF" strokeWidth={3} />)}
      <rect x={600} y={60} width={300} height={200} rx={12} fill="#FFFFFF" stroke="rgba(17,22,20,0.12)" />
      <rect x={630} y={95} width={150} height={18} rx={4} fill="#E1E6E3" />
      <rect x={630} y={130} width={230} height={70} rx={6} fill="#E6F2EB" stroke="#1F7A55" strokeDasharray="6 5" />
      <rect x={660} y={150} width={80} height={36} rx={4} fill="#1F7A55" opacity={0.5} />
    </svg>
  );
}
