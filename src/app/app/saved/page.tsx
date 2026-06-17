import SavedView from "@/components/pencil-app/SavedView";

export const metadata = { title: "Saved parcels — Pencil" };

export default function SavedPage() {
  return (
    <main className="app-content-pad">
      <h1 className="pa-display mb-1 text-2xl">Saved</h1>
      <p className="mb-5 text-sm" style={{ color: "var(--slate)" }}>
        Parcels you’re tracking, with your own notes.
      </p>
      <SavedView />
    </main>
  );
}
