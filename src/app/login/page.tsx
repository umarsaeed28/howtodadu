import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/portal/LoginForm";
import { currentViewer, homeFor } from "@/lib/portal/server";

export const metadata: Metadata = {
  title: "Sign in — Pencil",
  description: "Sign in to your Pencil portal to take a property from feasibility to a built DADU.",
};

/** Only paths inside the site are safe to send someone to after sign-in. */
function safeNext(v: string | undefined): string {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/portal";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const sp = await searchParams;
  const viewer = await currentViewer();
  if (viewer) redirect(sp.next ? safeNext(sp.next) : homeFor(viewer.role));
  return (
    <main className="pencil-app">
      <div className="mx-auto w-full max-w-[440px] px-4 pb-16 pt-10 md:pt-16">
        <LoginForm next={safeNext(sp.next)} initialMode={sp.mode === "signup" ? "signup" : "signin"} />
      </div>
    </main>
  );
}
