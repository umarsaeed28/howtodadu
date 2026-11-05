/**
 * Whether this browser has unlocked full feasibility reports by giving an email. One email unlocks every report.
 * Storage can be blocked (private windows, strict settings): then access lasts for the page's lifetime only.
 */
const KEY = "pencil.reportAccess.v1";

export function hasReportAccess(): boolean {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return false;
    const v = JSON.parse(raw) as { email?: unknown };
    return typeof v.email === "string" && v.email.includes("@");
  } catch {
    return false;
  }
}

export function grantReportAccess(email: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ email, at: new Date().toISOString() }));
  } catch {
    /* storage blocked: the caller keeps access in state for this page */
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
