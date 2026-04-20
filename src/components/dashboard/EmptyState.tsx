"use client";

export function EmptyState({
  title = "No properties match",
  description = "Upload a CSV, paste addresses, or analyze a single address to fill your workspace.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/40 px-6 py-16 text-center"
      role="status"
    >
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600">{description}</p>
    </div>
  );
}
