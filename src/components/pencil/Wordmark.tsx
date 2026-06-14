/** Pencil wordmark with a small drafting-tick glyph. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        {/* drafting tick / pencil mark */}
        <path
          d="M2 16 L11 7"
          stroke="var(--green)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M11 7 L14 4 L16 6 L13 9 Z"
          fill="var(--green)"
          stroke="var(--green)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      <span className="pencil-display text-[1.15rem] font-bold tracking-tight text-[var(--ink)]">
        Pencil
      </span>
    </span>
  );
}
