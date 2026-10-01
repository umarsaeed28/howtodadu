"use client";

import { useId } from "react";

export default function Field({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  error,
  placeholder,
  inputMode = "decimal",
  width,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
  width?: number | string;
}) {
  const id = useId();
  return (
    <div style={{ width }}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink)" }}>
        {label}
      </label>
      <div className="pa-inset flex items-center gap-1.5 px-3" style={{ minHeight: 42, outline: error ? "2px solid var(--red)" : undefined }}>
        {prefix && <span className="text-sm" style={{ color: "var(--slate)" }}>{prefix}</span>}
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-note` : undefined}
          className="w-full min-w-0 bg-transparent py-2 text-sm tabular-nums outline-none"
          autoComplete="off"
        />
        {suffix && <span className="shrink-0 text-xs" style={{ color: "var(--slate)" }}>{suffix}</span>}
      </div>
      {(error || hint) && (
        <p id={`${id}-note`} className="mt-1 text-xs" style={{ color: error ? "var(--red)" : "var(--slate)" }}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
