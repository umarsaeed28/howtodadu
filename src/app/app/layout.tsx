import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import StoreHydrator from "@/components/pencil-app/StoreHydrator";

export const metadata: Metadata = {
  title: "Pencil — Find parcels that pencil",
  description:
    "Browse Seattle / Puget Sound parcels and instantly see which ones pencil for middle housing.",
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="pencil-app">
      <StoreHydrator />
      {children}
    </div>
  );
}
