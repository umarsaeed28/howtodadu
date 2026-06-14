"use client";

import { ErrorState } from "@/components/pencil-app/states";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-dvh items-center justify-center">
      <ErrorState onRetry={reset} />
    </div>
  );
}
