import FilterBar from "@/components/pencil-app/FilterBar";
import SplitView from "@/components/pencil-app/SplitView";

export default function AppHome() {
  return (
    <div className="flex h-[calc(100dvh_-_var(--nav-h))] flex-col overflow-hidden">
      <p
        className="border-b px-4 py-2 text-center text-xs"
        style={{ borderColor: "var(--hairline)", color: "var(--slate)", background: "var(--card)" }}
      >
        Sample listings · ROI modeled from Pencil defaults (not live MLS data)
      </p>
      <FilterBar />
      <SplitView />
    </div>
  );
}
