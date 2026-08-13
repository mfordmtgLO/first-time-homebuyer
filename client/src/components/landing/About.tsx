/* GOLDEN HOUR PORCH — advisor bio: guide, not salesman. Advisor: Mike Ford, Cornerstone First Mortgage, NMLS# 288455 */
import { useReveal } from "@/hooks/useReveal";
import { EXPERIENCE_REVIEWS_URL } from "@/lib/reviews";
import { useAgentSlug, useLoanOfficerSlug } from "@/contexts/AgentPageContext";
import { trpc } from "@/lib/trpc";
import { BadgeCheck, ExternalLink, Phone } from "lucide-react";

// Enhanced Mike Ford portrait supplied for the public website profile.
const ADVISOR_IMG = "/manus-storage/mike-ford-headshot-enhanced_a17f8b15.webp";

export default function About() {
  const ref = useReveal<HTMLElement>();
  const agentSlug = useAgentSlug();
  const loanOfficerSlug = useLoanOfficerSlug();
  const pairQuery = trpc.loanOfficer.getPair.useQuery(
    { loanOfficerSlug: loanOfficerSlug ?? "", agentSlug: agentSlug ?? "" },
    { enabled: Boolean(loanOfficerSlug && agentSlug) }
  );
  const pairedOfficer = pairQuery.data?.officer ?? null;
  const advisor = pairedOfficer ?? {
    name: "Mike Ford",
    title: "Loan Officer",
    nmls: "288455",
    phone: "(541) 729-0819",
    email: "mford@cfmtg.com",
    companyName: "Cornerstone First Mortgage",
    bio: "",
    headshotUrl: ADVISOR_IMG,
  };
  const advisorImage = advisor.headshotUrl || ADVISOR_IMG;
  const isMike = advisor.name === "Mike Ford";
  return (
    <section id="about" ref={ref} className="py-20 md:py-28" style={{ background: "oklch(0.945 0.018 85)" }}>
      <div className="container grid lg:grid-cols-[4fr_7fr] gap-12 lg:gap-16 items-center">
        <div className="relative reveal">
          <div className="aspect-[4/3] max-w-md overflow-hidden rounded-md border border-primary/15 bg-card shadow-xl mx-auto lg:mx-0">
            <img src={advisorImage} alt={`${advisor.name}, ${advisor.title} at ${advisor.companyName || "Cornerstone First Mortgage"}`} className="h-full w-full object-cover object-top" />
          </div>
          <div className="absolute -bottom-5 right-2 flex items-center gap-2.5 border-t-4 bg-card px-5 py-3.5 shadow-lg lg:-right-4" style={{ borderTopColor: "oklch(0.73 0.13 75)" }}>
            <BadgeCheck className="h-5 w-5 text-primary" />
            <div className="text-sm font-semibold text-foreground leading-tight">
              {advisor.name}, {advisor.title}
              <span className="block text-xs font-normal text-muted-foreground">NMLS# {advisor.nmls || "—"} · Licensed in Oregon</span>
            </div>
          </div>
        </div>
        <div>
          <span className="key-tag bg-card text-secondary-foreground reveal">Your guide</span>
          <h2 className="mt-5 font-display font-semibold text-3xl md:text-[2.75rem] leading-[1.12] text-foreground reveal">
            An advisor in your corner.
          </h2>
          <div className="mt-6 space-y-4 text-lg text-muted-foreground leading-relaxed reveal">
            <p>
              {pairedOfficer?.bio ? pairedOfficer.bio : <>Hi, I'm <strong className="text-foreground font-semibold">{advisor.name}</strong>, a {advisor.title} with {advisor.companyName || "Cornerstone First Mortgage"}. I’m here to help you understand your home-financing options with clarity.</>}
            </p>
            <p>
              Technically, we're mortgage specialists, but we make amazing things possible. My job isn't to push
              you into a loan. It's to lay out your real options side-by-side — exact
              monthly payments, upfront costs, and long-term savings — so you can make the call with total
              clarity. If waiting genuinely is your best move, I'll tell you that too.
            </p>
            <p>
              Worried about your credit score or the paperwork? Don't be. We'll look at everything together,
              fix any quick red flags, and get you ready to shop with confidence.
            </p>
            <p className="text-base">
              <strong className="text-foreground font-semibold">Reach me directly:</strong>{" "}
              <a href={`tel:${advisor.phone.replace(/[^+\d]/g, "")}`} className="phone-link inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"><Phone className="phone-icon h-3.5 w-3.5 text-accent" />{advisor.phone}</a>
              {" · "}
              <a href={`mailto:${advisor.email}`} className="underline underline-offset-2 hover:text-foreground">{advisor.email}</a>
              {isMike && <span className="block mt-1 text-sm text-muted-foreground">17850 Pilkington Rd | Lake Oswego, OR 97035</span>}
            </p>
            {isMike && <a
              href={EXPERIENCE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-base font-semibold text-primary underline underline-offset-4 transition hover:text-foreground"
            >
              Read Mike’s verified client reviews on Experience.com <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>}
          </div>
          {isMike && <blockquote className="mt-7 border-l-4 pl-5 reveal" style={{ borderColor: "oklch(0.73 0.13 75)" }}>
            <p className="font-display text-xl md:text-2xl text-foreground italic leading-snug">
              "Purchasing a home should be exciting and joyful, not scary and confusing. That's where I come in."
            </p>
            <footer className="mt-2 text-sm font-semibold text-muted-foreground">— Mike Ford, NMLS# 288455</footer>
          </blockquote>}
        </div>
      </div>
    </section>
  );
}
