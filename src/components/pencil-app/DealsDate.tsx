"use client";

import { useEffect, useState } from "react";

export default function DealsDate() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    );
  }, []);
  return <span className="pa-mono">{label || "Today"}</span>;
}
