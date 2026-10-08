import "server-only";

/**
 * Portal email: every stage change, new file, bid received and action required. Sent through Resend's REST
 * API when RESEND_API_KEY and PORTAL_FROM_EMAIL are set; otherwise each message is logged so the flow can be
 * followed in development without an email account.
 */
export type Mail = { to: string[]; subject: string; text: string };

export async function sendMail(mail: Mail): Promise<"sent" | "logged" | "failed"> {
  const to = mail.to.filter((e) => e && e.includes("@"));
  if (!to.length) return "logged";
  const key = process.env.RESEND_API_KEY;
  const from = process.env.PORTAL_FROM_EMAIL;
  if (!key || !from) {
    console.log(`[portal mail] to ${to.join(", ")}: ${mail.subject}\n${mail.text}`);
    return "logged";
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: mail.subject, text: mail.text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[portal mail] Resend ${res.status}: ${await res.text()}`);
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error("[portal mail] failed", e);
    return "failed";
  }
}

/** An absolute link into the portal for emails: the configured site URL, else the Vercel production host, else local dev. */
export function portalUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3100");
  return `${base.replace(/\/$/, "")}${path}`;
}
