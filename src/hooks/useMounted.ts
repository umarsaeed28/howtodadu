"use client";

import { useState, useEffect } from "react";

/**
 * True after the component has mounted. Useful for triggering entrance animations.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
