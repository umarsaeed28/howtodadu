import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { WhatThisServiceIs } from "@/components/WhatThisServiceIs";
import { WhoThisIsFor } from "@/components/WhoThisIsFor";
import { WhatWeHelpWith } from "@/components/WhatWeHelpWith";
import { FeasibilityTool } from "@/components/FeasibilityTool";
import { HowTheProcessWorks } from "@/components/HowTheProcessWorks";
import { EducationAndGuides } from "@/components/EducationAndGuides";
import { Newsletter } from "@/components/Newsletter";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <WhatThisServiceIs />
        <WhoThisIsFor />
        <WhatWeHelpWith />
        <FeasibilityTool />
        <HowTheProcessWorks />
        <EducationAndGuides />
        <Newsletter />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
