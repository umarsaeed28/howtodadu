import { ENV_LABELS, type AdminEnv, ADMIN_ENVS } from "@/lib/admin/env";

/**
 * The environment banner on every admin page: which project the numbers come from, and the switch. Prod is red so
 * it is never mistaken for a sandbox. Environments without a connection are shown but cannot be chosen.
 */
export default function EnvBar({ env, host, available, path }: { env: AdminEnv | null; host: string | null; available: AdminEnv[]; path: string }) {
  const prod = env === "prod";
  const bg = env == null ? "var(--amber-tint)" : prod ? "var(--red-tint)" : "var(--green-tint)";
  const fg = env == null ? "var(--amber)" : prod ? "var(--red)" : "var(--green)";
  return (
    <div role="status" aria-atomic="true" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl px-4 py-2.5 text-sm" style={{ background: bg, color: fg }}>
      <p className="m-0 font-semibold">
        {env == null ? "No environment is configured: set SUPABASE_URL_<ENV> and SUPABASE_SECRET_KEY_<ENV>." : `${ENV_LABELS[env]} data${host ? `, ${host}` : ""}${prod ? ". Live customers: read only unless you confirm a change." : ""}`}
      </p>
      <form action="/api/admin/env" method="post" className="flex items-center gap-1" aria-label="Environment">
        <input type="hidden" name="next" value={path} />
        {ADMIN_ENVS.map((e) => {
          const on = e === env;
          const ok = available.includes(e);
          return (
            <button
              key={e}
              type="submit"
              name="env"
              value={e}
              disabled={!ok}
              aria-pressed={on}
              title={ok ? `Read ${ENV_LABELS[e]} data` : `${ENV_LABELS[e]} is not configured`}
              className="rounded-lg px-3 text-xs font-bold"
              style={{ minHeight: 32, background: on ? (e === "prod" ? "var(--red)" : "var(--green)") : "var(--card)", color: on ? "#fff" : ok ? "var(--ink)" : "var(--slate)", opacity: ok ? 1 : 0.55, cursor: ok ? "pointer" : "not-allowed", boxShadow: "var(--shadow-raised)" }}
            >
              {ENV_LABELS[e]}
            </button>
          );
        })}
      </form>
    </div>
  );
}
