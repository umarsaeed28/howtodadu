import { appendFile, mkdir } from "fs/promises";
import path from "path";
import { syncFeedbackToGit } from "@/lib/server/feedback-git-sync";

export const runtime = "nodejs";

const DATA_DIR = path.join(process.cwd(), "data", "feedback");
const ENTRIES = path.join(DATA_DIR, "entries.jsonl");

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const line = JSON.stringify({
    ...(body as Record<string, unknown>),
    serverReceivedAt: new Date().toISOString(),
  });

  try {
    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(ENTRIES, `${line}\n`, "utf8");
  } catch (e) {
    console.error("[feedback] write failed", e);
    return Response.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  syncFeedbackToGit();

  return Response.json({ ok: true });
}
