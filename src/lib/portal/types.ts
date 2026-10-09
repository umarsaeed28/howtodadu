import { PRODUCTS } from "@/lib/pricing";

/**
 * The portal's shared vocabulary: stages, statuses, their labels and order, and the pure rules that
 * follow from them (next action, referral fee owed, which builders fit a lead). No database here, so
 * every rule is testable and the pages, actions and seed all read the same words.
 */

export type Role = "client" | "admin" | "gc";

export const STAGES = ["acquire", "feasibility", "permit", "build"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABELS: Record<Stage, string> = {
  acquire: "Acquire",
  feasibility: "Feasibility",
  permit: "Architecture & permit",
  build: "Build",
};

export const PERMIT_STATUSES = ["kickoff", "design_options", "client_approval", "drawings", "submitted", "corrections", "approved"] as const;
export type PermitStatus = (typeof PERMIT_STATUSES)[number];
export const PERMIT_LABELS: Record<PermitStatus, string> = {
  kickoff: "Kickoff",
  design_options: "Design options",
  client_approval: "Client approval",
  drawings: "Drawings",
  submitted: "Submitted",
  corrections: "Corrections",
  approved: "Approved",
};

export const BUILD_STATUSES = ["contract_signed", "foundation", "framing", "mep", "inspections", "final", "certificate_of_occupancy"] as const;
export type BuildStatus = (typeof BUILD_STATUSES)[number];
export const BUILD_LABELS: Record<BuildStatus, string> = {
  contract_signed: "Contract signed",
  foundation: "Foundation",
  framing: "Framing",
  mep: "MEP",
  inspections: "Inspections",
  final: "Final",
  certificate_of_occupancy: "Certificate of occupancy",
};

export const BUDGET_TIERS = ["under_250k", "250k_400k", "over_400k"] as const;
export type BudgetTier = (typeof BUDGET_TIERS)[number];
export const BUDGET_LABELS: Record<BudgetTier, string> = { under_250k: "Under $250k", "250k_400k": "$250k to $400k", over_400k: "Over $400k" };

export const AREAS = ["north", "central", "south", "west", "east"] as const;
export type Area = (typeof AREAS)[number];
export const AREA_LABELS: Record<Area, string> = { north: "North Seattle", central: "Central Seattle", south: "South Seattle", west: "West Seattle", east: "East side" };

export const SIZE_TIERS = ["small", "medium", "large"] as const;
export type SizeTier = (typeof SIZE_TIERS)[number];
export const SIZE_LABELS: Record<SizeTier, string> = { small: "Small (under 600 sf)", medium: "Medium (600 to 900 sf)", large: "Large (over 900 sf)" };

/** The permit service, from the one price list. Design comes from a custom plan or a pre-approved plan. */
export const PERMIT_PACKAGE = {
  feeCents: PRODUCTS.permit.amountCents,
  timeline: "From SDCI submission to issued permit. The city sets its own review times.",
  includes: ["Permit set prepared from your plans", "SDCI submission and fees handling", "Every round of city corrections", "Status updates at each step"],
};

export const FILE_KINDS = { drawing: "Drawing", city_letter: "City letter", other: "Other" } as const;
export type FileKind = keyof typeof FILE_KINDS;

/* ── Row shapes as the pages read them (a subset of the tables) ── */
export type Project = {
  id: string;
  owner_id: string;
  address: string | null;
  parcel_id: string | null;
  stage: Stage;
  lot_help_requested: boolean;
  lot_help_notes: string;
  brokerage_fee_cents: number;
  selected_gc_id: string | null;
  build_status: BuildStatus | null;
  latest_update: string;
  created_at: string;
  updated_at: string;
};
export type FeasibilityRow = { id: string; project_id: string; score: number; verdict: string; max_dadu_sf: number | null; buildable_area_sf: number | null; summary: Record<string, unknown>; created_at: string };
export type PermitPackage = { id: string; project_id: string; status: PermitStatus; fee_cents: number; payment_id: string | null; paid_at: string | null; correction_rounds: number; submitted_at: string | null; approved_at: string | null; created_at: string; updated_at: string };
export type ProjectFile = { id: string; project_id: string; name: string; path: string; kind: FileKind; size_bytes: number; uploaded_by: string | null; created_at: string };
export type DesignOption = { id: string; project_id: string; title: string; description: string; file_id: string | null; status: "proposed" | "approved" | "rejected"; decided_at: string | null; created_at: string };
export type BuildRequest = { id: string; project_id: string; budget_tier: BudgetTier; timeline: string; finishes: string; financing: string; area: string; size_tier: SizeTier; disclosure_ack_at: string; created_at: string };
export type GcPartner = { id: string; user_id: string | null; company: string; contact_name: string; email: string; phone: string; budget_tiers: string[]; areas: string[]; size_tiers: string[]; active: boolean };
export type Referral = { id: string; project_id: string; gc_id: string; agreement_note: string; contract_value_cents: number | null; fee_type: "percent" | "flat"; fee_value: number; status: "referred" | "bid" | "won" | "lost" | "paid"; paid_at: string | null; created_at: string };
export type Bid = { id: string; project_id: string; gc_id: string; amount_cents: number; timeline_weeks: number; notes: string; status: "submitted" | "selected" | "declined"; created_at: string };
export type Activity = { id: string; project_id: string; actor_id: string | null; kind: string; message: string; meta: Record<string, unknown>; created_at: string };

/** Everything one project page needs, loaded once. */
export type ProjectBundle = {
  project: Project;
  feasibility: FeasibilityRow | null;
  permit: PermitPackage | null;
  files: ProjectFile[];
  designs: DesignOption[];
  buildRequest: BuildRequest | null;
  referrals: Referral[];
  bids: Bid[];
  gcs: GcPartner[];
  activity: Activity[];
};

/* ── Pure rules ── */

export function stageIndex(stage: Stage): number {
  return STAGES.indexOf(stage);
}

/** The one thing the client should do next, and who it is waiting on. */
export function nextAction(b: Pick<ProjectBundle, "project" | "feasibility" | "permit" | "designs" | "buildRequest" | "bids">): { text: string; who: "client" | "pencil" | "gc" | "done" } {
  const { project: p, permit, designs, buildRequest, bids } = b;
  if (p.stage === "acquire") {
    if (p.lot_help_requested && !p.address) return { text: "Pencil is finding lots for you", who: "pencil" };
    return { text: "Confirm the address and pull the parcel", who: "client" };
  }
  if (p.stage === "feasibility") {
    if (!b.feasibility) return { text: "Run the free feasibility check", who: "client" };
    return { text: "Start your permit package", who: "client" };
  }
  if (p.stage === "permit") {
    if (!permit || !permit.paid_at) return { text: "Pay for the permit package to kick off", who: "client" };
    if (permit.status === "client_approval" || (permit.status === "design_options" && designs.some((d) => d.status === "proposed"))) return { text: "Approve a design option", who: "client" };
    if (permit.status === "approved") return { text: "Get a build quote", who: "client" };
    if (permit.status === "corrections") return { text: `Pencil is answering the city (round ${permit.correction_rounds})`, who: "pencil" };
    if (permit.status === "submitted") return { text: "Waiting on the city's review", who: "pencil" };
    return { text: `Pencil is working on ${PERMIT_LABELS[permit.status].toLowerCase()}`, who: "pencil" };
  }
  // build
  if (p.build_status) {
    if (p.build_status === "certificate_of_occupancy") return { text: "Your DADU is complete", who: "done" };
    return { text: `${BUILD_LABELS[p.build_status]} in progress`, who: "gc" };
  }
  if (!buildRequest) return { text: "Answer the build questionnaire", who: "client" };
  if (bids.some((x) => x.status === "selected")) return { text: "Waiting for the builder to sign the contract", who: "gc" };
  if (bids.length) return { text: `Compare ${bids.length} bid${bids.length === 1 ? "" : "s"} and pick a builder`, who: "client" };
  return { text: "Pencil is matching you with builders", who: "pencil" };
}

/** The referral fee owed on a contract, in cents. Null until the contract value is known. */
export function referralFeeCents(r: Pick<Referral, "contract_value_cents" | "fee_type" | "fee_value">): number | null {
  if (r.fee_type === "flat") return Math.round(Number(r.fee_value) * 100);
  if (r.contract_value_cents == null) return null;
  return Math.round((r.contract_value_cents * Number(r.fee_value)) / 100);
}

/** The DADU size bucket a build request falls in. */
export function sizeTierFor(daduSf: number | null | undefined): SizeTier {
  if (daduSf == null) return "medium";
  if (daduSf < 600) return "small";
  if (daduSf <= 900) return "medium";
  return "large";
}

/** Builders that fit a lead, best match first: budget, area and size each count one point. */
export function matchGcs(req: Pick<BuildRequest, "budget_tier" | "area" | "size_tier">, gcs: GcPartner[]): { gc: GcPartner; points: number }[] {
  return gcs
    .filter((g) => g.active)
    .map((gc) => ({
      gc,
      points: (gc.budget_tiers.includes(req.budget_tier) ? 1 : 0) + (req.area && gc.areas.includes(req.area) ? 1 : 0) + (gc.size_tiers.includes(req.size_tier) ? 1 : 0),
    }))
    .sort((a, b) => b.points - a.points || a.gc.company.localeCompare(b.gc.company));
}

export const usd = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;

/* ── The permit service's four-step tracker, on top of the permit package statuses ── */
export const PERMIT_TRACKER = ["intake", "submitted", "corrections", "issued"] as const;
export type PermitTrackerStep = (typeof PERMIT_TRACKER)[number];
export const PERMIT_TRACKER_LABELS: Record<PermitTrackerStep, string> = {
  intake: "Intake",
  submitted: "Submitted to SDCI",
  corrections: "Corrections",
  issued: "Issued",
};
/** Kickoff through drawings is still intake; the city's approval is the issued permit. */
export function permitTrackerStep(status: PermitStatus): PermitTrackerStep {
  if (status === "approved") return "issued";
  if (status === "corrections") return "corrections";
  if (status === "submitted") return "submitted";
  return "intake";
}
