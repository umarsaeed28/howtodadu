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
  title: "How to DADU. Buy well. Build smart.",
  description:
    "We help investors find, plan, and build middle housing in Seattle. From the right property to permit ready plans.",
  keywords: [
    "Seattle middle housing",
    "DADU Seattle",
    "backyard cottage Seattle",
    "middle housing investing",
    "Seattle property development",
    "ADU Seattle",
  ],
  openGraph: {
    title: "How to DADU. Buy well. Build smart.",
    description:
      "We help investors find, plan, and build middle housing in Seattle. From the right property to permit ready plans.",
    type: "website",
    locale: "en_US",
    url: "https://howtodadu.com",
    siteName: "How to DADU",
  },
  twitter: {
    card: "summary_large_image",
    title: "How to DADU. Buy well. Build smart.",
    description:
      "We help investors find, plan, and build middle housing in Seattle. From the right property to permit ready plans.",
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
