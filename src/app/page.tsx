import { Spectral, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./htd.css";

import Nav from "@/components/htd/Nav";
import Hero from "@/components/htd/Hero";
import WhatWeDo from "@/components/htd/WhatWeDo";
import WhoItsFor from "@/components/htd/WhoItsFor";
import Opportunity from "@/components/htd/Opportunity";
import HowItWorks from "@/components/htd/HowItWorks";
import SeeNumbers from "@/components/htd/SeeNumbers";
import CheckProperty from "@/components/htd/CheckProperty";
import Properties from "@/components/htd/Properties";
import WhyUs from "@/components/htd/WhyUs";
import Faq from "@/components/htd/Faq";
import TalkToUs from "@/components/htd/TalkToUs";
import Footer from "@/components/htd/Footer";

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

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export default function Home() {
  return (
    <div className={`htd-site ${spectral.variable} ${hanken.variable} ${plexMono.variable}`}>
      <Nav />
      <main>
        <Hero />
        <WhatWeDo />
        <WhoItsFor />
        <Opportunity />
        <HowItWorks />
        <SeeNumbers />
        <CheckProperty />
        <Properties />
        <WhyUs />
        <Faq />
        <TalkToUs />
      </main>
      <Footer />
    </div>
  );
}
