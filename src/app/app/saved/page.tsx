import { redirect } from "next/navigation";

export default function SavedPage() {
  redirect("/feasibility?view=favorites");
}
