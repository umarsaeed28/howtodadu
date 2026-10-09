import { redirect } from "next/navigation";

/** The client home moved to /dashboard ("Your properties"). Old links land there. */
export default function PortalHome() {
  redirect("/dashboard");
}
