import { Nav } from "@/components/pencil/Nav";
import { Hero } from "@/components/pencil/Hero";
import { TrustStrip } from "@/components/pencil/TrustStrip";
import { WhyNow } from "@/components/pencil/WhyNow";
import { HowItWorks } from "@/components/pencil/HowItWorks";
import { DailyDeals } from "@/components/pencil/DailyDeals";
import { WhyDifferent } from "@/components/pencil/WhyDifferent";
import { Pricing } from "@/components/pencil/Pricing";
import { Proof } from "@/components/pencil/Proof";
import { Faq } from "@/components/pencil/Faq";
import { FinalCta } from "@/components/pencil/FinalCta";
import { Footer } from "@/components/pencil/Footer";

export default function PencilPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <TrustStrip />
        <WhyNow />
        <HowItWorks />
        <DailyDeals />
        <WhyDifferent />
        <Pricing />
        <Proof />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
