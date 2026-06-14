import { MapSkeleton, ResultsSkeleton } from "@/components/pencil-app/states";

export default function AppLoading() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="h-[53px] border-b" style={{ borderColor: "var(--hairline)", background: "var(--card)" }} />
      <div className="h-[49px] border-b" style={{ borderColor: "var(--hairline)", background: "var(--paper)" }} />
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[56%] md:block">
          <MapSkeleton />
        </div>
        <div className="w-full overflow-hidden border-l bg-[var(--paper)] p-4 md:w-[44%]" style={{ borderColor: "var(--hairline)" }}>
          <ResultsSkeleton />
        </div>
      </div>
    </div>
  );
}
