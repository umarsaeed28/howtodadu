"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { FILE_KINDS } from "@/lib/portal/types";

/** Adds a drawing or city letter to the project. Posts to the upload route, then refreshes the page. */
export default function FileUpload({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const f = fd.get("file");
    if (!(f instanceof File) || !f.size) return setError("Choose a file.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/files", { method: "POST", body: fd });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) return setError(j.error === "too_large" ? "Files up to 25 MB." : "The upload did not go through.");
      form.current?.reset();
      router.refresh();
    } catch {
      setError("The upload did not go through.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={form} onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="project_id" value={projectId} />
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold" style={{ color: "var(--ink)" }}>
        File
        <input name="file" type="file" className="s-field py-2.5 text-sm" style={{ minHeight: 42 }} accept=".pdf,.png,.jpg,.jpeg,.dwg,.zip" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "var(--ink)" }}>
        Kind
        <select name="kind" className="s-field" style={{ minHeight: 42 }} defaultValue="drawing">
          {Object.entries(FILE_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>
      <button type="submit" className="pa-btn" disabled={busy} style={{ minHeight: 42 }}>
        {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Upload size={14} aria-hidden />} Upload
      </button>
      {error && <p role="alert" className="text-xs sm:ml-2" style={{ color: "var(--red)" }}>{error}</p>}
    </form>
  );
}
