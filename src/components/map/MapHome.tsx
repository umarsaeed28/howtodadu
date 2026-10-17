"use client";

import dynamic from "next/dynamic";
import type { PrecedentPin } from "./CandidateMap";

const CandidateMap = dynamic(() => import("./CandidateMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100dvh_-_var(--nav-h))] items-center justify-center text-sm" style={{ color: "var(--slate)" }}>
      Loading the map…
    </div>
  ),
});

/** The map. `precedents` (plan library pins) is passed only by the admin map. */
export default function MapHome({ precedents }: { precedents?: PrecedentPin[] } = {}) {
  return <CandidateMap precedents={precedents} />;
}
