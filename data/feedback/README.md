# ML feedback data (version-controlled)

These files are **tracked in git** so feedback is not lost across machines.

| File | Purpose |
|------|---------|
| `entries.jsonl` | One JSON object per line: thumbs, reasons, full analysis snapshot. |
| `digest.md` | Human-readable rollup (regenerated on build and after each feedback write when auto-commit runs). |

## Auto-commit (recommended locally)

After each successful `POST /api/feedback`, the app can regenerate the digest and **`git commit`** the `data/feedback/` updates.

- **Default:** enabled whenever `FEEDBACK_AUTO_GIT_COMMIT` is **not** set to `0`, and not running in CI/Vercel.
- **Disable:** set `FEEDBACK_AUTO_GIT_COMMIT=0` in `.env.local`.

Requires `git` on your PATH and `user.name` / `user.email` configured.

## Push to remote

Commits stay local until you run:

```bash
git push
```

Or use your usual branch/PR workflow; nothing is auto-pushed.

## Browser-only sessions

If the API is unavailable, feedback remains in `localStorage` under `howtodadu.analysisFeedback.v1`. Use the app against `npm run dev` so `/api/feedback` can persist to `entries.jsonl` and git.
