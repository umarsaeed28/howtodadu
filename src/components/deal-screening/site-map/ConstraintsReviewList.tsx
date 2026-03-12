"use client";

interface ConstraintsReviewListProps {
  items: string[];
  className?: string;
}

export function ConstraintsReviewList({
  items,
  className = "",
}: ConstraintsReviewListProps) {
  if (items.length === 0) return null;

  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
        Key constraints to review
      </p>
      <ul className="space-y-1 text-xs text-[var(--muted-foreground)]">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-[var(--foreground)] mt-0.5">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-[var(--muted-foreground)] mt-3 italic leading-relaxed">
        This is a preliminary site reading and should be verified during full feasibility and design review.
      </p>
    </div>
  );
}
