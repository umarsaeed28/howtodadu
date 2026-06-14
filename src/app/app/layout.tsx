import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./app.css";
import StoreHydrator from "@/components/pencil-app/StoreHydrator";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "700"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Pencil — Find parcels that pencil",
  description:
    "Browse Seattle / Puget Sound parcels and instantly see which ones pencil for middle housing.",
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`pencil-app ${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <StoreHydrator />
      {children}
    </div>
  );
}
