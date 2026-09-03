import { Hero } from "@/components/marketing/hero";
import { RealCost } from "@/components/marketing/real-cost";
import { HowGuidanceWorks } from "@/components/marketing/how-guidance-works";
import { GuidanceToDone } from "@/components/marketing/guidance-to-done";
import { Pricing } from "@/components/marketing/pricing";
import { WhyTrust } from "@/components/marketing/why-trust";
import { FAQ } from "@/components/marketing/faq";
import { FinalCTA } from "@/components/marketing/final-cta";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <RealCost />
      <HowGuidanceWorks />
      <GuidanceToDone />
      <div id="pricing">
        <Pricing />
      </div>
      <WhyTrust />
      <div id="faq">
        <FAQ />
      </div>
      <FinalCTA />
    </>
  );
}
