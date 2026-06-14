import AppBar from "@/components/pencil-app/AppBar";
import FilterBar from "@/components/pencil-app/FilterBar";
import SplitView from "@/components/pencil-app/SplitView";

export default function AppHome() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppBar />
      <FilterBar />
      <SplitView />
    </div>
  );
}
