/**
 * Turns a dropped folder (or a pile of PDFs) into plan sets: one set per folder that holds PDFs, titled after the
 * folder, with the folder path kept for tags. A PDF dropped on its own is a set by itself. Non-PDFs are skipped and
 * reported. Pure: the upload screen and the tests share it.
 */

export interface PickedFile<T = unknown> {
  name: string;
  /** Path inside the dropped folder, e.g. "2024/Ballard/123 Main St/A1.1 Floor plan.pdf"; the name for a loose file. */
  relPath: string;
  size: number;
  /** The browser File, carried along untouched. */
  file?: T;
}

export interface PlannedSet<T = unknown> {
  key: string;
  title: string;
  folder: string;
  files: PickedFile<T>[];
}

const isPdf = (f: PickedFile) => /\.pdf$/i.test(f.name);
const dirname = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");

export function groupUpload<T>(files: PickedFile<T>[]): { sets: PlannedSet<T>[]; skipped: string[] } {
  const skipped: string[] = [];
  const byFolder = new Map<string, PlannedSet<T>>();
  for (const f of files) {
    if (/(^|\/)\.[^/]*$/.test(f.relPath)) continue; // hidden files (.DS_Store) are not worth a mention
    if (!isPdf(f)) {
      skipped.push(f.relPath);
      continue;
    }
    const folder = dirname(f.relPath.replace(/\\/g, "/"));
    const key = folder || `file:${f.relPath}`;
    let set = byFolder.get(key);
    if (!set) {
      const title = folder ? folder.split("/").pop()! : f.name.replace(/\.pdf$/i, "");
      set = { key, title, folder, files: [] };
      byFolder.set(key, set);
    }
    set.files.push(f);
  }
  const sets = [...byFolder.values()].sort((a, b) => a.key.localeCompare(b.key));
  for (const s of sets) s.files.sort((a, b) => a.relPath.localeCompare(b.relPath, undefined, { numeric: true }));
  return { sets, skipped };
}

/** Runs `work` over `items` with at most `limit` running at once; results keep the input order. */
export async function pool<I, O>(items: I[], limit: number, work: (item: I, index: number) => Promise<O>): Promise<O[]> {
  const out: O[] = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await work(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return out;
}
