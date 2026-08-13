/* GOLDEN HOUR PORCH — compliance footer: Cornerstone First Mortgage, NMLS ID #173855, Mike Ford NMLS# 288455, Equal Opportunity Lender */
import { Phone } from "lucide-react";

const LOGO = "/manus-storage/cornerstone-logo-standard_8b43a164.png";

export default function Footer() {
  return (
    <footer className="py-12 border-t border-border" style={{ background: "oklch(0.945 0.018 85)" }}>
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div className="max-w-sm">
            <img src={LOGO} alt="Cornerstone First Mortgage logo" className="h-10 w-auto object-contain" />
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              At Cornerstone First Mortgage, LLC we are dedicated to delivering high-quality customer service
              and offer an extensive range of home loan programs with competitive rates to deliver a solution
              that best fits the need of each client.
            </p>
            <div className="mt-4 text-sm text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground">Mike Ford · Loan Officer · NMLS# 288455</p>
              <p>C: <a href="tel:+15417290819" className="phone-link inline-flex items-center gap-1 hover:text-foreground"><Phone className="phone-icon h-3 w-3" />(541) 729-0819</a> · <a href="mailto:mford@cfmtg.com" className="hover:text-foreground">mford@cfmtg.com</a></p>
              <p>17850 Pilkington Rd | Lake Oswego, OR 97035</p>
              <p className="mt-1">Licensed in: Oregon</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <a href="#programs" className="text-muted-foreground hover:text-foreground transition-colors">Loan Programs</a>
            <a href="#roadmap" className="text-muted-foreground hover:text-foreground transition-colors">Free Roadmap</a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About Mike</a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            <a href="#book-call" className="text-muted-foreground hover:text-foreground transition-colors">Get Started</a>
            <a
              href="https://portal.myhometrac.com/borrower/signup/mford@cfmtg.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Apply Online
            </a>
            <a
              href="https://nmlsconsumeraccess.org/EntityDetails.aspx/INDIVIDUAL/288455"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              NMLS Consumer Access
            </a>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border/70 text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>
            For licensing information go to:{" "}
            <a
              href="https://www.nmlsconsumeraccess.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              www.nmlsconsumeraccess.org
            </a>{" "}
            · Cornerstone First Mortgage, LLC · NMLS ID #173855
          </p>
          <p>
            Cornerstone First Mortgage, LLC · 2655 Camino Del Rio N., Suite 100, San Diego, CA 92108 ·
            (866) 815-1803 · info@cfmtg.com
          </p>
          <p>
            This is not a commitment to lend. All loans are subject to credit approval, underwriting, and
            program guidelines. Program availability, rates, and terms are subject to change without notice and
            may vary by location, income, and credit profile. USDA, VA, FHA, and conventional loan eligibility
            requirements apply.
          </p>
          <p className="flex flex-wrap items-center gap-1.5">
            © {new Date().getFullYear()} Cornerstone First Mortgage, LLC. All Rights Reserved. NMLS ID #173855
            Equal Opportunity Lender.
            <img
              src="/manus-storage/equal-housing-opportunity-logo_a0ad8f72.png"
              alt="Equal Housing Opportunity logo"
              className="h-8 w-auto object-contain"
            />
          </p>
        </div>
      </div>
    </footer>
  );
}
