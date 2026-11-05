import type { Metadata } from "next";
import { Archivo, Public_Sans } from "next/font/google";
import "./globals.css";
import "./pencil-ui.css";
import "./site.css";
import SiteShell from "@/components/site/SiteShell";

const archivo = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
});

const publicSans = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pencil — See what a property can become.",
  description:
    "Pencil helps you find, plan, and build middle housing in Seattle. It reads the parcel, the zoning, and real costs, then tells you what a property can become and whether it pencils.",
  keywords: [
    "Seattle middle housing",
    "DADU Seattle",
    "backyard cottage Seattle",
    "middle housing investing",
    "Seattle property development",
    "ADU Seattle",
  ],
  openGraph: {
    title: "Pencil — See what a property can become.",
    description:
      "Find, plan, and build middle housing in Seattle. Pencil tells you what a property can become and whether it pencils.",
    type: "website",
    locale: "en_US",
    url: "https://pencil.studio",
    siteName: "Pencil",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pencil — See what a property can become.",
    description:
      "Find, plan, and build middle housing in Seattle. Pencil tells you what a property can become and whether it pencils.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${publicSans.variable} antialiased`}
      >
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
