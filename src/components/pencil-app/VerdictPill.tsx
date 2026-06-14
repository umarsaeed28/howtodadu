import { Check, Minus, X } from "lucide-react";
import type { Verdict } from "@/lib/parcels";

const META: Record<
  Verdict,
  { label: string; cls: string; Icon: typeof Check }
> = {
  PENCILS: { label: "PENCILS", cls: "pa-verdict-pencils", Icon: Check },
  TIGHT: { label: "TIGHT", cls: "pa-verdict-tight", Icon: Minus },
  NO: { label: "NO", cls: "pa-verdict-no", Icon: X },
};

export default function VerdictPill({
  verdict,
  size = "sm",
}: {
  verdict: Verdict;
  size?: "sm" | "md" | "lg";
}) {
  const { label, cls, Icon } = META[verdict];
  const dims =
    size === "lg"
      ? "text-sm px-3 py-1.5"
      : size === "md"
        ? "text-xs px-2.5 py-1"
        : "text-[0.7rem] px-2 py-0.5";
  const icon = size === "lg" ? 16 : size === "md" ? 14 : 12;
  return (
    <span className={`pa-verdict ${cls} ${dims}`}>
      <Icon size={icon} strokeWidth={2.5} aria-hidden />
      {label}
    </span>
  );
}
