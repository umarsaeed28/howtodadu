import AppBar from "@/components/pencil-app/AppBar";
import SavedView from "@/components/pencil-app/SavedView";

export const metadata = { title: "Saved parcels — Pencil" };

export default function SavedPage() {
  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <AppBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="pa-display mb-1 text-2xl">Saved</h1>
        <p className="mb-5 text-sm" style={{ color: "var(--slate)" }}>
          Parcels you’re tracking, with your own notes.
        </p>
        <SavedView />
      </main>
    </div>
  );
}
