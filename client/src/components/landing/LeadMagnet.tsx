/* GOLDEN HOUR PORCH — roadmap download form (primary lead capture, wired to backend) */
import { useState } from "react";
import { useReveal } from "@/hooks/useReveal";
import { useScenario } from "@/contexts/ScenarioContext";
import { useAgentSlug, useLoanOfficerSlug } from "@/contexts/AgentPageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Download, CheckCircle2, Loader2, Calculator, Hourglass, X } from "lucide-react";

const fmtUsd = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const COVER_IMG = "/manus-storage/roadmap-cover_fa8d4dfa.png";

const bullets = [
  "A step-by-step breakdown of the entire process — from setting your budget to grabbing your keys",
  "Which zero-down and low-down programs you may qualify for (USDA, VA, FHA & more)",
  "The pre-approval checklist real estate agents expect before showing homes",
  "How to spot — and fix — quick credit red flags before they cost you",
];

export default function LeadMagnet() {
  const ref = useReveal<HTMLElement>();
  const { scenario, attached, setAttached, cowScenario, cowAttached, setCowAttached } = useScenario();
  const agentSlug = useAgentSlug();
  const loanOfficerSlug = useLoanOfficerSlug();
  const [submitted, setSubmitted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");

  const submitLead = trpc.leads.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("You're in! Check your inbox for the Roadmap.");
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) {
      toast.error("Please fill in your first name and email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    const includeScenario = attached && scenario ? scenario : undefined;
    const includeCow = cowAttached && cowScenario ? cowScenario : undefined;
    const sourceTags = ["roadmap"];
    if (includeScenario) sourceTags.push("buydown");
    if (includeCow) sourceTags.push("waiting");
    if (agentSlug) sourceTags.push(`agent:${agentSlug}`.slice(0, 24));
    if (loanOfficerSlug) sourceTags.push(`lo:${loanOfficerSlug}`.slice(0, 24));
    submitLead.mutate({
      firstName: firstName.trim(),
      email: email.trim(),
      source: sourceTags.join("+"),
      scenario: includeScenario,
      costOfWaiting: includeCow,
      agentSlug: agentSlug ?? undefined,
      loanOfficerSlug: loanOfficerSlug ?? undefined,
    });
  };

  return (
    <section id="roadmap" ref={ref} className="py-20 md:py-28" style={{ background: "oklch(0.945 0.018 85)" }}>
      <div className="container grid lg:grid-cols-[5fr_7fr] gap-12 lg:gap-16 items-center">
        <div className="relative reveal order-last lg:order-first">
          <div
            aria-hidden
            className="absolute -inset-6 rounded-full opacity-50 blur-2xl"
            style={{ background: "radial-gradient(circle, oklch(0.73 0.13 75 / 0.3), transparent 70%)" }}
          />
          <img
            src={COVER_IMG}
            alt="The First-Time Homebuyer Roadmap guide cover"
            className="relative mx-auto w-64 md:w-80 rounded-md shadow-2xl rotate-[-2deg]"
          />
        </div>
        <div>
          <span className="key-tag bg-card text-secondary-foreground reveal">Free guide</span>
          <h2 className="mt-5 font-display font-semibold text-3xl md:text-[2.75rem] leading-[1.12] text-foreground reveal">
            The First-Time Homebuyer <span className="amber-underline">Roadmap</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed reveal">
            Everything the process actually looks like — without the jargon, the guesswork, or the sales pitch.
          </p>
          <ul className="mt-6 space-y-3 reveal">
            {bullets.map((b) => (
              <li key={b} className="flex gap-3 text-base text-foreground/85 leading-relaxed">
                <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                {b}
              </li>
            ))}
          </ul>
          {submitted ? (
            <div className="mt-8 rounded-lg bg-card border border-border p-6 reveal in-view">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-7 w-7 text-primary" />
                <div>
                  <div className="font-semibold text-foreground">You're all set, {firstName}!</div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Your Roadmap is on its way to {email}. Keep an eye out for a few quick tips over the next
                    couple of days.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 reveal">
              {attached && scenario && (
                <div className="mb-4 flex items-start gap-3 rounded-md border border-primary/25 bg-card px-4 py-3">
                  <Calculator className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                  <div className="flex-1 text-sm text-foreground/85 leading-relaxed">
                    <span className="font-semibold text-foreground">Your buydown scenario is attached:</span>{" "}
                    {fmtUsd(scenario.purchasePrice)} purchase · {fmtUsd(scenario.downPayment)} down ·{" "}
                    {scenario.noteRate}% note rate · saves {fmtUsd(scenario.year1MonthlySavings)}/mo in year 1.
                    Mike will review these exact numbers with you.
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttached(false)}
                    aria-label="Remove attached scenario"
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {cowAttached && cowScenario && (
                <div className="mb-4 flex items-start gap-3 rounded-md border border-primary/25 bg-card px-4 py-3">
                  <Hourglass className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                  <div className="flex-1 text-sm text-foreground/85 leading-relaxed">
                    <span className="font-semibold text-foreground">Your cost-of-waiting scenario is attached:</span>{" "}
                    waiting {cowScenario.waitYears} {cowScenario.waitYears === 1 ? "year" : "years"} at{" "}
                    {fmtUsd(cowScenario.monthlyRent)}/mo rent vs a {fmtUsd(cowScenario.purchasePrice)} home ·
                    est. cost of waiting {fmtUsd(cowScenario.costOfWaiting)}. Mike will review these exact
                    numbers with you.
                  </div>
                  <button
                    type="button"
                    onClick={() => setCowAttached(false)}
                    aria-label="Remove attached cost-of-waiting scenario"
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  aria-label="First name"
                  className="h-12 rounded-md border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-ring/60 sm:w-44"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  aria-label="Email address"
                  className="h-12 flex-1 rounded-md border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-ring/60"
                />
                <button
                  type="submit"
                  disabled={submitLead.isPending}
                  className="btn-press inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-6 text-base font-semibold text-accent-foreground shadow-md hover:brightness-105 disabled:opacity-70 disabled:pointer-events-none"
                >
                  {submitLead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {submitLead.isPending ? "Sending..." : "Send me the Roadmap"}
                </button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                No spam, ever. Just the guide and a few genuinely useful tips. Unsubscribe anytime.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
