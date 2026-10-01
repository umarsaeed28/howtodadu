"use client";

import dynamic from "next/dynamic";

const CandidateMap = dynamic(() => import("./CandidateMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100dvh_-_var(--nav-h))] items-center justify-center text-sm" style={{ color: "var(--slate)" }}>
      Loading the map…
    </div>
  ),
});

export default function MapHome() {
  return <CandidateMap />;
}
