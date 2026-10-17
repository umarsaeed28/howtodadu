"use client";

import { useEffect, useState } from "react";
import MapHome from "@/components/map/MapHome";
import type { PrecedentPin } from "@/components/map/CandidateMap";

/** The shared map plus the plan library's located sets as precedent pins (from the admin's chosen environment). */
export default function AdminMap() {
  const [pins, setPins] = useState<PrecedentPin[]>([]);
  useEffect(() => {
    const ctl = new AbortController();
    fetch("/api/admin/plans/pins", { signal: ctl.signal })
      .then((r) => r.json())
      .then((j: { ok: boolean; pins?: PrecedentPin[] }) => setPins(j.ok ? j.pins ?? [] : []))
      .catch(() => {});
    return () => ctl.abort();
  }, []);
  return <MapHome precedents={pins} />;
}
