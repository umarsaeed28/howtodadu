"use client";

import { FavoriteStarButton } from "@/components/feasibility-tool/FavoriteStarButton";

/** Favorites control for table rows — thin wrapper for the star control. */
export function FavoriteToggle(props: { address: string }) {
  return <FavoriteStarButton address={props.address} />;
}
