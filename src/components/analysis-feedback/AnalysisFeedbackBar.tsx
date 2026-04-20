"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import {
  appendFeedback,
  buildAnalysisSnapshot,
  findFeedbackForAnalysis,
  mirrorFeedbackToServer,
  type AnalysisFeedbackRecord,
  type FeedbackRating,
} from "@/lib/analysis-feedback";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "howtodadu-local";

function newRecord(
  row: FeasibilityTableRow,
  rating: FeedbackRating,
  negativeReason: string | null
): AnalysisFeedbackRecord {
  const snapshot = buildAnalysisSnapshot(row);
  return {
    id: crypto.randomUUID(),
    createdAtIso: new Date().toISOString(),
    rating,
    negativeReason,
    snapshot,
    appVersion: APP_VERSION,
  };
}

interface AnalysisFeedbackBarProps {
  row: FeasibilityTableRow;
}

export function AnalysisFeedbackBar({ row }: AnalysisFeedbackBarProps) {
  const snapshot = buildAnalysisSnapshot(row);
  const { logicFingerprint, address } = snapshot;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const [reasonOpen, setReasonOpen] = useState(false);
  const [pendingDown, setPendingDown] = useState(false);
  const [current, setCurrent] = useState<AnalysisFeedbackRecord | null>(null);

  const refresh = useCallback(() => {
    setCurrent(findFeedbackForAnalysis(address, logicFingerprint) ?? null);
  }, [address, logicFingerprint]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = useCallback(
    (rating: FeedbackRating, negativeReason: string | null) => {
      const rec = newRecord(row, rating, negativeReason);
      appendFeedback(rec);
      void mirrorFeedbackToServer(rec);
      setCurrent(rec);
      setReasonOpen(false);
      setPendingDown(false);
      if (reasonRef.current) reasonRef.current.value = "";
      dialogRef.current?.close();
    },
    [row]
  );

  const onThumbUp = () => {
    submit("up", null);
  };

  const onThumbDownClick = () => {
    setPendingDown(true);
    setReasonOpen(true);
    dialogRef.current?.showModal();
    reasonRef.current?.focus();
  };

  const onConfirmDown = () => {
    const text = (reasonRef.current?.value ?? "").trim();
    if (text.length < 3) {
      reasonRef.current?.focus();
      return;
    }
    submit("down", text);
  };

  const onCancelDialog = () => {
    setReasonOpen(false);
    setPendingDown(false);
    dialogRef.current?.close();
  };

  const active = current?.rating;
  const isUp = active === "up";
  const isDown = active === "down";

  return (
    <div
      className="rounded-xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm"
      role="region"
      aria-label="Rate this analysis"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-zinc-800">Was this analysis helpful?</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onThumbUp}
            className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
              isUp
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-zinc-200 bg-white text-zinc-800 hover:border-emerald-400"
            }`}
            aria-pressed={isUp}
          >
            <ThumbsUp className="size-4" aria-hidden />
            Yes
          </button>
          <button
            type="button"
            onClick={onThumbDownClick}
            className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
              isDown
                ? "border-red-300 bg-red-50 text-red-900"
                : "border-zinc-200 bg-white text-zinc-800 hover:border-red-300"
            }`}
            aria-pressed={isDown}
          >
            <ThumbsDown className="size-4" aria-hidden />
            No
          </button>
        </div>
        {current ? (
          <span className="text-xs text-zinc-500">
            Thanks — saved{current.rating === "down" && current.negativeReason ? " with your note" : ""}.
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-zinc-500">
        Feedback is saved in your browser and in{" "}
        <code className="rounded bg-zinc-100 px-1">data/feedback/</code> (tracked in git, auto-commit
        after each save when you use <code className="rounded bg-zinc-100 px-1">npm run dev</code>).
        Push to your remote so it is never lost.
      </p>

      <dialog
        ref={dialogRef}
        className="w-[min(100%,420px)] rounded-xl border border-zinc-200 bg-white p-4 shadow-lg backdrop:bg-black/40"
        aria-labelledby={titleId}
        onClose={onCancelDialog}
      >
        {reasonOpen || pendingDown ? (
          <>
            <h2 id={titleId} className="text-sm font-semibold text-zinc-900">
              What felt wrong?
            </h2>
            <p className="mt-1 text-xs text-zinc-600">
              Your note is stored with this score, zoning, and coverage snapshot so we can improve the logic.
            </p>
            <textarea
              ref={reasonRef}
              className="mt-3 w-full min-h-[100px] rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="e.g. Coverage is too optimistic, zoning is wrong, score is too high…"
              required
              aria-label="What felt wrong with this analysis"
            />
            <p className="mt-1 text-[11px] text-zinc-500">Minimum 3 characters.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                onClick={onCancelDialog}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                onClick={onConfirmDown}
              >
                Submit feedback
              </button>
            </div>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
