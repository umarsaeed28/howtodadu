"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Opportunity } from "@/lib/invest/opportunity";
import OpportunityTile from "@/components/invest/OpportunityTile";
import { Container, Heading, Lede, Section } from "@/components/ui";

/**
 * "Today's best backyard opportunities": the top three tiles from the Invest feed. Loaded in the browser so the home
 * page stays static; the section hides itself when the feed is empty or unavailable.
 */
export default function InvestTeaser() {
  const [items, setItems] = useState<Opportunity[] | null>(null);
  const [source, setSource] = useState("");
  useEffect(() => {
    let live = true;
    fetch("/api/invest/top?limit=3")
      .then((r) => r.json())
      .then((j: { opportunities?: Opportunity[]; source?: string }) => {
        if (!live) return;
        setItems(j.opportunities ?? []);
        setSource(j.source ?? "");
      })
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
  }, []);
  if (items && items.length === 0) return null;
  return (
    <Section style={{ paddingBlock: "clamp(3.5rem, 7vw, 6rem)" }} aria-labelledby="hm-invest-h">
      <Container>
        <Heading level={2} id="hm-invest-h" style={{ maxWidth: "22ch" }}>Today&apos;s best backyard opportunities</Heading>
        <Lede style={{ marginTop: 14 }}>Seattle listings that can take the largest DADU the code allows. Updated daily.</Lede>
        <div className="pencil-app hm-invest" style={{ background: "transparent" }}>
          {items ? (
            <ul className="iv-grid">
              {items.map((o, i) => <OpportunityTile key={o.id} o={o} position={i + 1} source={source} watched={false} from="home" />)}
            </ul>
          ) : (
            <div className="iv-grid" aria-busy="true">{[0, 1, 2].map((k) => <div key={k} className="hm-invest-skel" />)}</div>
          )}
          <Link href="/search?top=1" className="pa-btn pa-btn-primary hm-invest-cta">See all opportunities <ArrowRight size={15} aria-hidden /></Link>
        </div>
      </Container>
    </Section>
  );
}
