/**
 * Funnel events: visitor → feasibility → plan → permit.
 *
 * No analytics provider is installed yet, so track() is provider-agnostic: it pushes to window.dataLayer
 * (Google Tag Manager), and calls window.gtag, window.plausible or window.posthog when one of them is on the
 * page. It also fires a "pencil:track" DOM event so tests or a future provider can listen. In development it
 * logs to the console. Never send personal data (addresses, emails, names) as event properties.
 */
export type FunnelEvent =
  | { name: "hero_cta_click"; props: { cta: "check_my_lot" | "browse_plans" | "draw_my_dadu" | "path_card"; path?: string } }
  | { name: "address_submitted"; props: { source: "hero" | "footer_cta" | "feasibility" } }
  | { name: "pricing_card_click"; props: { tier: string } }
  | { name: "teaser_viewed"; props: { eligible: boolean } }
  | { name: "paywall_tier_clicked"; props: { tier: string } }
  | { name: "report_purchased"; props: { tier: string } }
  | { name: "plan_viewed"; props: { plan_id: string } }
  | { name: "plan_requested"; props: { plan_id: string } }
  | { name: "footprint_drawn"; props: { preset: string; fits: boolean } }
  | { name: "draft_generated"; props: { source: "ai" | "rules" } }
  | { name: "custom_checkout"; props: { booked: boolean } }
  | { name: "permit_checkout"; props: Record<string, never> };

type W = Window & {
  dataLayer?: unknown[];
  gtag?: (cmd: "event", name: string, props: object) => void;
  plausible?: (name: string, opts: { props: object }) => void;
  posthog?: { capture: (name: string, props: object) => void };
};

export function track<E extends FunnelEvent>(name: E["name"], props: E["props"]): void {
  if (typeof window === "undefined") return;
  const w = window as W;
  try {
    (w.dataLayer ??= []).push({ event: name, ...props });
    w.gtag?.("event", name, props);
    w.plausible?.(name, { props });
    w.posthog?.capture(name, props);
    window.dispatchEvent(new CustomEvent("pencil:track", { detail: { name, props } }));
    if (process.env.NODE_ENV === "development") console.info("[track]", name, props);
  } catch {
    /* analytics must never break the page */
  }
}
