/* GOLDEN HOUR PORCH — landing page assembly */
import { ScenarioProvider } from "@/contexts/ScenarioContext";
import { AgentPageProvider } from "@/contexts/AgentPageContext";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import MythBuster from "@/components/landing/MythBuster";
import Programs from "@/components/landing/Programs";
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
        <div className="min-h-screen">
          <Nav />
          <main>
            <Hero />
            <MythBuster />
            <Programs />
            <Buydown />
            <LeadMagnet />
            <HowItWorks />
            <About />
            <Faq />
            <FinalCta />
            <LocalAgent />
            <Footer />
          </main>
          <MortgageChatWidget />
        </div>
      </ScenarioProvider>
    </AgentPageProvider>
  );
}
