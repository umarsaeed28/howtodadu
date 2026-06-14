"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

/** Rehydrates the persisted store after mount to avoid SSR/client mismatches. */
export default function StoreHydrator() {
  useEffect(() => {
    useAppStore.persist.rehydrate();
  }, []);
  return null;
}
