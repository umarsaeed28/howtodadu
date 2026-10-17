"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FolderUp, FileUp, Loader2, RefreshCw } from "lucide-react";
import { groupUpload, pool, type PickedFile, type PlannedSet } from "@/lib/plans/group-upload";
import type { PlanSetRow, PlanStatus } from "@/lib/server/plan-library";
import PlanSetEditor from "./PlanSetEditor";

const STATUS: { key: PlanStatus; label: string; color: string }[] = [
  { key: "uploaded", label: "Uploaded", color: "var(--slate)" },
  { key: "extracting", label: "Extracting", color: "var(--amber)" },
  { key: "needs_correction", label: "Needs correction", color: "#8A6A1F" },
  { key: "verified", label: "Verified", color: "var(--green)" },
  { key: "failed", label: "Failed", color: "var(--red)" },
];
export const statusLabel = (s: PlanStatus) => STATUS.find((x) => x.key === s) ?? STATUS[0];

type Progress = Record<string, { relPath: string; phase: "queued" | "uploading" | "uploaded" | "extracting" | "done" | "failed"; note?: string }>;

/** Reads a dropped folder tree (or loose files) with each file's path inside the folder. */
async function filesFromDrop(dt: DataTransfer): Promise<PickedFile<File>[]> {
  const entries = [...dt.items].map((i) => i.webkitGetAsEntry()).filter((e): e is FileSystemEntry => !!e);
  if (!entries.length) return [...dt.files].map((f) => ({ name: f.name, relPath: f.name, size: f.size, file: f }));
  const out: PickedFile<File>[] = [];
  const walk = async (e: FileSystemEntry, path: string): Promise<void> => {
    if (e.isFile) {
      const f = await new Promise<File>((ok, err) => (e as FileSystemFileEntry).file(ok, err));
      out.push({ name: f.name, relPath: `${path}${f.name}`, size: f.size, file: f });
    } else if (e.isDirectory) {
      const reader = (e as FileSystemDirectoryEntry).createReader();
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((ok, err) => reader.readEntries(ok, err));
        if (!batch.length) break; // readEntries returns at most ~100 at a time
        for (const child of batch) await walk(child, `${path}${e.name}/`);
      }
    }
  };
  for (const e of entries) await walk(e, "");
  return out;
}

const fromInput = (list: FileList | null): PickedFile<File>[] =>
  [...(list ?? [])].map((f) => ({ name: f.name, relPath: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name, size: f.size, file: f }));

const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;

/** The plan library: bulk upload (folders become plan sets, their paths tags), the status board, and review. */
export default function PlanLibrary() {
  const sp = useSearchParams();
  const [sets, setSets] = useState<PlanSetRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [planned, setPlanned] = useState<{ sets: PlannedSet<File>[]; skipped: string[] } | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PlanStatus | "all">("all");
  const [selected, setSelected] = useState<string | null>(sp.get("set"));
  const [dragging, setDragging] = useState(false);
  const processing = useRef(new Set<string>());

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/plans", { cache: "no-store" });
      const j = (await r.json()) as { ok: boolean; sets?: PlanSetRow[]; error?: string };
      if (!j.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setSets(j.sets ?? []);
      setLoadError(null);
      return j.sets ?? [];
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load the plan library.");
      return null;
    }
  }, []);

  const mark = (id: string, patch: Partial<Progress[string]>) => setProgress((p) => ({ ...p, [id]: { ...p[id], ...patch } as Progress[string] }));

  /** Extracts files one or two at a time; a file another tab already took is skipped by the server. */
  const processFiles = useCallback(async (ids: string[]) => {
    const todo = ids.filter((id) => !processing.current.has(id));
    todo.forEach((id) => processing.current.add(id));
    await pool(todo, 2, async (id) => {
      setProgress((p) => (p[id] ? { ...p, [id]: { ...p[id], phase: "extracting" } } : p));
      try {
        const r = await fetch(`/api/admin/plans/files/${id}/process`, { method: "POST" });
        const j = (await r.json()) as { ok: boolean; status?: PlanStatus; error?: string | null };
        setProgress((p) => (p[id] ? { ...p, [id]: { ...p[id], phase: j.ok && j.status !== "failed" ? "done" : "failed", note: j.error ?? undefined } } : p));
      } catch {
        setProgress((p) => (p[id] ? { ...p, [id]: { ...p[id], phase: "failed", note: "Extraction request failed; retry from the board." } } : p));
      } finally {
        processing.current.delete(id);
        void load();
      }
    });
  }, [load]);

  // On arrival, pick up files that finished uploading but were never extracted (a closed tab, a failed request).
  useEffect(() => {
    void load().then((rows) => {
      const waiting = (rows ?? []).flatMap((s) => (s.files ?? []).filter((f) => f.uploaded && f.status === "uploaded").map((f) => f.id));
      if (waiting.length) void processFiles(waiting);
    });
  }, [load, processFiles]);

  // While anything is in flight, keep the board fresh.
  const inFlight = busy || (sets ?? []).some((s) => s.status === "uploaded" || s.status === "extracting");
  useEffect(() => {
    if (!inFlight) return;
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [inFlight, load]);

  function pick(files: PickedFile<File>[]) {
    setError(null);
    const g = groupUpload(files);
    if (!g.sets.length) setError(g.skipped.length ? `No PDFs found (${g.skipped.length} other files skipped).` : "No files found.");
    setPlanned(g);
  }

  async function upload() {
    if (!planned?.sets.length) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/plans/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sets: planned.sets.map((s) => ({ title: s.title, folder: s.folder, files: s.files.map((f) => ({ name: f.name, relPath: f.relPath, size: f.size })) })) }),
      });
      const j = (await r.json()) as { ok: boolean; error?: string; sets?: { setId: string; files: { fileId: string; relPath: string; uploadUrl: string }[] }[] };
      if (!j.ok || !j.sets) throw new Error(j.error ?? `HTTP ${r.status}`);
      const jobs = j.sets.flatMap((s, si) => s.files.map((f, fi) => ({ ...f, file: planned.sets[si].files[fi].file! })));
      setProgress(Object.fromEntries(jobs.map((x) => [x.fileId, { relPath: x.relPath, phase: "queued" as const }])));
      setPlanned(null);
      void load();
      const uploaded: string[] = [];
      await pool(jobs, 3, async (x) => {
        mark(x.fileId, { phase: "uploading" });
        try {
          const put = await fetch(x.uploadUrl, { method: "PUT", headers: { "Content-Type": "application/pdf", "x-upsert": "false" }, body: x.file });
          if (!put.ok) throw new Error(`storage answered ${put.status}`);
          const c = await fetch(`/api/admin/plans/files/${x.fileId}/confirm`, { method: "POST" });
          const cj = (await c.json()) as { ok: boolean; error?: string };
          if (!cj.ok) throw new Error(cj.error ?? "not confirmed");
          mark(x.fileId, { phase: "uploaded" });
          uploaded.push(x.fileId);
        } catch (e) {
          mark(x.fileId, { phase: "failed", note: `Upload failed: ${e instanceof Error ? e.message : String(e)}` });
        }
      });
      await processFiles(uploaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload could not start.");
    } finally {
      setBusy(false);
      void load();
    }
  }

  const counts = useMemo(() => Object.fromEntries(STATUS.map((s) => [s.key, (sets ?? []).filter((x) => x.status === s.key).length])) as Record<PlanStatus, number>, [sets]);
  const shown = (sets ?? []).filter((s) => filter === "all" || s.status === filter);
  const current = (sets ?? []).find((s) => s.id === selected) ?? null;
  const progressList = Object.entries(progress);

  return (
    <div className="pl-wrap">
      <section
        className={`pl-drop ${dragging ? "pl-drop--on" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void filesFromDrop(e.dataTransfer).then(pick); }}
        aria-label="Upload drawing sets"
      >
        <p className="pl-drop-t">Drop a folder of drawing sets, or many PDFs</p>
        <p className="aw-muted">Each folder with PDFs becomes one plan set; its folder path becomes tags. PDFs up to 100 MB, 500 per upload.</p>
        <div className="aw-actions" style={{ justifyContent: "center", marginTop: 12 }}>
          <label className="pa-btn pa-btn-sm"><FolderUp size={14} aria-hidden /> Choose a folder<input type="file" className="sr-only" multiple {...{ webkitdirectory: "" }} onChange={(e) => pick(fromInput(e.target.files))} /></label>
          <label className="pa-btn pa-btn-sm"><FileUp size={14} aria-hidden /> Choose PDFs<input type="file" className="sr-only" multiple accept="application/pdf,.pdf" onChange={(e) => pick(fromInput(e.target.files))} /></label>
        </div>
      </section>

      {error && <p role="alert" className="pl-err">{error}</p>}

      {planned && planned.sets.length > 0 && (
        <section className="aw-panel" aria-label="Ready to upload">
          <h2 className="aw-h3">{planned.sets.length} plan set{planned.sets.length === 1 ? "" : "s"}, {planned.sets.reduce((n, s) => n + s.files.length, 0)} PDFs ready</h2>
          <ul className="aw-list">
            {planned.sets.map((s, i) => (
              <li key={s.key} className="pl-plan">
                <input aria-label={`Title for ${s.folder || s.files[0].name}`} className="pl-input" value={s.title} onChange={(e) => setPlanned((p) => p && { ...p, sets: p.sets.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                <span className="aw-muted">{s.files.length} PDF{s.files.length === 1 ? "" : "s"}, {mb(s.files.reduce((n, f) => n + f.size, 0))}{s.folder ? ` | tags: ${s.folder.split("/").join(", ")}` : ""}</span>
              </li>
            ))}
          </ul>
          {planned.skipped.length > 0 && <p className="aw-muted">Skipped {planned.skipped.length} non-PDF file{planned.skipped.length === 1 ? "" : "s"}.</p>}
          <div className="aw-actions">
            <button type="button" className="pa-btn pa-btn-primary pa-btn-sm" onClick={() => void upload()} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null} Upload all</button>
            <button type="button" className="pa-btn pa-btn-sm" onClick={() => setPlanned(null)} disabled={busy}>Cancel</button>
          </div>
        </section>
      )}

      {progressList.length > 0 && (
        <section className="aw-panel" aria-label="Upload progress" aria-live="polite">
          <h2 className="aw-h3">This upload: {progressList.filter(([, p]) => p.phase === "done" || p.phase === "failed").length} of {progressList.length} files finished</h2>
          <ul className="pl-prog">
            {progressList.map(([id, p]) => (
              <li key={id}><span className="pl-prog-name">{p.relPath}</span> <span style={{ color: p.phase === "failed" ? "var(--red)" : p.phase === "done" ? "var(--green)" : "var(--slate)" }}>{p.phase}</span>{p.note ? <span className="aw-muted"> {p.note}</span> : null}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Status board">
        <div className="pl-board-h">
          <div className="pl-chips" role="tablist" aria-label="Filter by status">
            <button type="button" role="tab" aria-selected={filter === "all"} className={`pa-chip ${filter === "all" ? "pa-chip-active" : ""}`} onClick={() => setFilter("all")}>All {sets?.length ?? 0}</button>
            {STATUS.map((s) => (
              <button key={s.key} type="button" role="tab" aria-selected={filter === s.key} className={`pa-chip ${filter === s.key ? "pa-chip-active" : ""}`} onClick={() => setFilter(s.key)}>
                <span className="pl-dot" style={{ background: s.color }} aria-hidden /> {s.label} {counts[s.key] ?? 0}
              </button>
            ))}
          </div>
          <button type="button" className="pa-btn pa-btn-sm" onClick={() => void load()} aria-label="Refresh the board"><RefreshCw size={14} aria-hidden /></button>
        </div>
        {loadError && <p role="alert" className="pl-err">{loadError}</p>}
        {!sets && !loadError && <p className="aw-muted"><Loader2 size={14} className="mr-1 inline animate-spin" aria-hidden /> Loading the library…</p>}
        {sets && shown.length === 0 && <p className="aw-muted">No plan sets{filter === "all" ? " yet. Drop a folder above to start." : " with this status."}</p>}
        <ul className="pl-sets">
          {shown.map((s) => {
            const st = statusLabel(s.status);
            const pages = (s.files ?? []).reduce((n, f) => n + (f.page_count ?? 0), 0);
            return (
              <li key={s.id}>
                <button type="button" className={`pl-set ${selected === s.id ? "pl-set--on" : ""}`} onClick={() => setSelected(selected === s.id ? null : s.id)} aria-expanded={selected === s.id}>
                  <span className="pl-set-t">{s.title}</span>
                  <span className="pl-pill" style={{ color: st.color, borderColor: st.color }}>{st.label}</span>
                  <span className="aw-muted pl-set-meta">
                    {(s.files ?? []).length} PDF{(s.files ?? []).length === 1 ? "" : "s"}{pages ? `, ${pages} pages` : ""} | {s.address ?? "no address"}{s.lat != null ? " (on map)" : ""} | {s.license}
                    {s.tags.length ? ` | ${s.tags.join(", ")}` : ""}
                  </span>
                </button>
                {selected === s.id && current && <PlanSetEditor set={current} onSaved={() => void load()} onRetry={(ids) => void processFiles(ids)} />}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
