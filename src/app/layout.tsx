import type { Metadata } from "next";
import {
  Space_Grotesk,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  Spectral,
  Hanken_Grotesk,
} from "next/font/google";
import "./globals.css";
import "./app/app.css";
import "./site.css";
import SiteShell from "@/components/site/SiteShell";

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

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Pencil — See what a lot can become.",
  description:
    "Pencil helps you find, plan, and build middle housing in Seattle. It reads the parcel, the zoning, and real costs, then tells you what a lot can become and whether it pencils.",
  keywords: [
    "Seattle middle housing",
    "DADU Seattle",
    "backyard cottage Seattle",
    "middle housing investing",
    "Seattle property development",
    "ADU Seattle",
  ],
  openGraph: {
    title: "Pencil — See what a lot can become.",
    description:
      "Find, plan, and build middle housing in Seattle. Pencil tells you what a lot can become and whether it pencils.",
    type: "website",
    locale: "en_US",
    url: "https://pencil.studio",
    siteName: "Pencil",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pencil — See what a lot can become.",
    description:
      "Find, plan, and build middle housing in Seattle. Pencil tells you what a lot can become and whether it pencils.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable} ${spectral.variable} ${hanken.variable} antialiased`}
      >
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
