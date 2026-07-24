# Documents folder

Drop your Seattle middle-housing markdown files in this folder (subfolders are
fine — they're scanned recursively). Then run:

```bash
python -m seattle_rag ingest
```

Each file is chunked by its markdown headings, embedded, and stored in ChromaDB.
Re-running `ingest` after editing a file re-indexes just that file.

Suggested naming so ordering/citations read well, e.g.:

- `10-hb1110-middle-housing.md`
- `20-nr-zone-standards.md`
- `30-dadu-adu-rules.md`
- `40-tree-protection.md`

You can delete this README once you've added real content.
