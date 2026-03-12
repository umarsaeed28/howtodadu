"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface FeasibilityContextValue {
  hasResults: boolean;
  setHasResults: (value: boolean) => void;
}

const FeasibilityContext = createContext<FeasibilityContextValue | null>(null);

export function FeasibilityProvider({ children }: { children: React.ReactNode }) {
  const [hasResults, setHasResults] = useState(false);
  return (
    <FeasibilityContext.Provider value={{ hasResults, setHasResults }}>
      {children}
    </FeasibilityContext.Provider>
  );
}

export function useFeasibilityContext() {
  const ctx = useContext(FeasibilityContext);
  return ctx;
}
