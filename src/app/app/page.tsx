import FilterBar from "@/components/pencil-app/FilterBar";
import SplitView from "@/components/pencil-app/SplitView";

export default function AppHome() {
  return (
    <div className="flex h-[calc(100dvh_-_var(--nav-h))] flex-col overflow-hidden">
      <FilterBar />
      <SplitView />
    </div>
  );
}
