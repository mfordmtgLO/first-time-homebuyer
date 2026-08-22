/* GOLDEN HOUR PORCH — landing page assembly */
import { ScenarioProvider } from "@/contexts/ScenarioContext";
import { AgentPageProvider } from "@/contexts/AgentPageContext";
import Nav from "@/components/landing/Nav";
import PublicSectionNav from "@/components/landing/PublicSectionNav";
import Hero from "@/components/landing/Hero";
import MythBuster from "@/components/landing/MythBuster";
import Programs from "@/components/landing/Programs";
import MortgageEstimator from "@/components/landing/MortgageEstimator";
import Buydown from "@/components/landing/Buydown";
import LeadMagnet from "@/components/landing/LeadMagnet";
import HowItWorks from "@/components/landing/HowItWorks";
import About from "@/components/landing/About";
import Faq from "@/components/landing/Faq";
import FinalCta from "@/components/landing/FinalCta";
import LocalAgent from "@/components/landing/LocalAgent";
import Footer from "@/components/landing/Footer";
import MortgageChatWidget from "@/components/MortgageChatWidget";

export default function Home({
  agentSlug = null,
  loanOfficerSlug = null,
}: {
  agentSlug?: string | null;
  loanOfficerSlug?: string | null;
}) {
  return (
    <AgentPageProvider agentSlug={agentSlug} loanOfficerSlug={loanOfficerSlug}>
      <ScenarioProvider>
        <div id="top" className="min-h-screen">
          <Nav />
          <PublicSectionNav />
          <main>
            <div className="scroll-mt-36 md:scroll-mt-40"><Hero /></div>
            <div id="cost-of-waiting" className="scroll-mt-36 md:scroll-mt-40"><MythBuster /></div>
            <div id="programs" className="scroll-mt-36 md:scroll-mt-40"><Programs /></div>
            <div id="mortgage-estimator" className="scroll-mt-36 md:scroll-mt-40"><MortgageEstimator /></div>
            <div id="buydown" className="scroll-mt-36 md:scroll-mt-40"><Buydown /></div>
            <div id="roadmap" className="scroll-mt-36 md:scroll-mt-40"><LeadMagnet /></div>
            <div id="how-it-works" className="scroll-mt-36 md:scroll-mt-40"><HowItWorks /></div>
            <div id="about" className="scroll-mt-36 md:scroll-mt-40"><About /></div>
            <div id="faq" className="scroll-mt-36 md:scroll-mt-40"><Faq /></div>
            <div id="contact" className="scroll-mt-36 md:scroll-mt-40"><FinalCta /></div>
            <div id="local-agent" className="scroll-mt-36 md:scroll-mt-40"><LocalAgent /></div>
            <Footer />
          </main>
          <MortgageChatWidget compactWhenIdle />
        </div>
      </ScenarioProvider>
    </AgentPageProvider>
  );
}
