import type { Metadata } from "next";
import SavedList from "@/components/listing/SavedList";
import MembersTeaser from "@/components/members/MembersTeaser";
import { currentAdmin } from "@/lib/admin/server";

export const metadata: Metadata = {
  title: "Saved homes — Pencil",
  description: "The homes and lots you saved while browsing, with a CSV download.",
  robots: { index: false, follow: false },
};

export default async function SavedPage() {
  if (!(await currentAdmin())) return <MembersTeaser from="/saved" />;
  return (
    <main className="pencil-app">
      <SavedList />
    </main>
  );
}
