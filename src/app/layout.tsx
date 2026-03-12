import type { Metadata } from "next";
import { Space_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "How to DADU — Acquisition Service | Seattle Middle Housing",
  description:
    "A Seattle acquisition service focused on middle housing. We help investors identify the right property, evaluate development potential, and design projects ready for permits.",
  keywords: [
    "DADU Seattle",
    "Seattle DADU guide",
    "middle housing Seattle",
    "Seattle property acquisition",
    "DADU architect Seattle",
    "backyard cottage Seattle",
    "ADU design Seattle",
    "duplex design Seattle",
    "triplex design Seattle",
    "fourplex Seattle",
    "Seattle development",
    "DADU feasibility Seattle",
  ],
  openGraph: {
    title: "How to DADU — Acquisition Service | Seattle Middle Housing",
    description:
      "A Seattle acquisition service focused on middle housing. We help investors identify properties, evaluate development potential, and prepare permit-ready drawings.",
    type: "website",
    locale: "en_US",
    url: "https://howtodadu.com",
    siteName: "HOW TO DADU",
  },
  twitter: {
    card: "summary_large_image",
    title: "How to DADU — Acquisition Service | Seattle Middle Housing",
    description:
      "A Seattle acquisition service focused on middle housing. We help investors identify properties, evaluate development potential, and prepare permit-ready drawings.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceMono.variable} ${playfair.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
