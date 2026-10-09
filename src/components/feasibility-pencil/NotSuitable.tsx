import Link from "next/link";
import { ArrowRight, Ban } from "lucide-react";

/**
 * Shown instead of a report when a property fails the NR zoning gate (src/lib/zoning.ts): no partial analysis, a plain
 * reason, and the way to properties that can take a DADU.
 */
export default function NotSuitable({ address, zoning, message }: { address: string; zoning: string | null; message: string }) {
  return (
    <section role="alert" aria-labelledby="ns-h" className="pa-raised mx-auto mt-5 max-w-xl p-5 text-left">
      <p className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--red)" }}>
        <Ban size={14} aria-hidden /> Not suitable for a DADU
      </p>
      <h2 id="ns-h" className="pa-display mt-2 text-xl" style={{ color: "var(--ink)" }}>{address}</h2>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--slate)" }}>{message}</p>
      {zoning && (
        <p className="mt-2 text-sm" style={{ color: "var(--ink)" }}>
          Zoning on city records: <strong>{zoning}</strong>
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/search?top=1" className="pa-btn pa-btn-primary no-underline">
          Search NR-zoned properties <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
