import type { Metadata } from "next";
import SavedList from "@/components/listing/SavedList";

export const metadata: Metadata = {
  title: "Saved homes — Pencil",
  description: "The homes and lots you saved while browsing, with a CSV download.",
};

export default function SavedPage() {
  return (
    <main className="pencil-app">
      <SavedList />
    </main>
  );
}
