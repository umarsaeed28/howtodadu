import "server-only";
import { adminDb } from "@/lib/admin/server";
import type { AdminEnv } from "@/lib/admin/env";

/**
 * The plan library (migration 0013): architectural drawing sets the admin uploads, their files in the private
 * `plan-library` bucket, and what extraction found in them. Admin-only: every read and write here uses the admin's
 * chosen environment (the env switcher) and its secret key; there are no row-level policies for anyone else.
 */

export const PLAN_STATUSES = ["uploaded", "extracting", "needs_correction", "verified", "failed"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];
export const PLAN_LICENSES = ["internal", "precedent", "template"] as const;
export type PlanLicense = (typeof PLAN_LICENSES)[number];

export interface Precedent {
  id: string;
  title: string;
  address: string | null;
  lat: number;
  lng: number;
  built: boolean | null;
  status: PlanStatus;
  license: PlanLicense;
  distanceM: number;
}

const R = 6_371_000;
export function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Plan sets with a known location within `radiusM` of a point, nearest first. */
export async function nearbyPrecedents(env: AdminEnv | null, lat: number, lng: number, radiusM = 1600, limit = 8): Promise<Precedent[]> {
  const db = adminDb(env);
  const dLat = radiusM / 111_000;
  const dLng = radiusM / (111_000 * Math.cos((lat * Math.PI) / 180));
  const { data, error } = await db
    .from("plan_sets")
    .select("id, title, address, lat, lng, built, status, license")
    .gte("lat", lat - dLat).lte("lat", lat + dLat)
    .gte("lng", lng - dLng).lte("lng", lng + dLng)
    .limit(200);
  if (error || !data) return [];
  return data
    .map((r) => ({ ...r, distanceM: Math.round(metersBetween(lat, lng, r.lat, r.lng)) }) as Precedent)
    .filter((r) => r.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit);
}

/** Every located plan set, for the precedent pins on the admin map. */
export async function precedentPins(env: AdminEnv | null): Promise<Omit<Precedent, "distanceM">[]> {
  const db = adminDb(env);
  const { data, error } = await db.from("plan_sets").select("id, title, address, lat, lng, built, status, license").not("lat", "is", null).not("lng", "is", null).limit(2000);
  return error || !data ? [] : (data as Omit<Precedent, "distanceM">[]);
}
