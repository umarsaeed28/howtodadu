/**
 * The people on the /company page. Only real people go here, with the role they gave us; never invent a bio.
 * `photo` is a path under public/ (e.g. "/team/umar-saeed.webp"); without one the card shows initials.
 *
 * Placeholder slots mark where the next people go. They render in development only, so nothing fake ships:
 * replace one with a real person (and drop `placeholder`) to publish it.
 */
export type TeamMember = {
  name: string;
  role: string;
  bio?: string;
  photo?: string;
  placeholder?: boolean;
};

export const TEAM: TeamMember[] = [
  { name: "Umar Saeed", role: "Founder · Architect · Real estate investor" },
  { name: "Team member", role: "Role", placeholder: true },
  { name: "Team member", role: "Role", placeholder: true },
];

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
