import { currentViewer, userClient } from "@/lib/portal/server";
import { seattleDay } from "@/lib/server/invest";

/** "Updated today at 7:02 AM", in Seattle time. */
export function updatedLabel(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
  if (seattleDay(d) === seattleDay()) return `Updated today at ${time}`;
  return `Updated ${d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" })} at ${time}`;
}

/** The client's watched listing ids, for the hearts. Empty when signed out or the table is not there yet. */
export async function watchedIds(): Promise<{ signedIn: boolean; ids: string[] }> {
  const viewer = await currentViewer().catch(() => null);
  if (!viewer) return { signedIn: false, ids: [] };
  try {
    const db = await userClient();
    const { data } = await db.from("watchlist").select("listing_id").eq("owner_id", viewer.id);
    return { signedIn: true, ids: (data ?? []).map((r: { listing_id: string }) => r.listing_id) };
  } catch {
    return { signedIn: true, ids: [] };
  }
}
