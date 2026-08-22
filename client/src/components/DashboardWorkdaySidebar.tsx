import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { estimateMonthlyHousingCost } from "@shared/mortgageEstimator";
import { Calculator, Loader2, PanelLeftClose, PanelLeftOpen, Sparkles, ChevronDown, ChevronRight, Workflow, Target, Users, MapPinned, MessageSquareText, ReceiptText, Megaphone, BookOpenCheck } from "lucide-react";

type WorkflowRecord = { label: string; status: string; meta: string };

type WorkflowSection = {
  id: "campaign-funnel" | "platform-leads" | "roadmap-leads" | "co-marketing-agents" | "loan-officers" | "texting-workspace" | "chat-intakes" | "saved-qualifying-listings" | "pairing-spend-tracker";
  label: string;
  icon: typeof Target;
  recommendation: string;
};

const SECTIONS: WorkflowSection[] = [
  { id: "campaign-funnel", label: "Funnel & campaigns", icon: Megaphone, recommendation: "Review attribution, cost per captured lead, and any campaign that needs a budget or creative adjustment." },
  { id: "platform-leads", label: "Ad platform leads", icon: Target, recommendation: "Work new and due follow-ups first; set ownership, a progress state, and a documented next action." },
  { id: "roadmap-leads", label: "Roadmap requests", icon: BookOpenCheck, recommendation: "Prioritize new requests with a usable phone or email, then record a clear follow-up outcome." },
  { id: "chat-intakes", label: "Mortgage chat intakes", icon: MessageSquareText, recommendation: "Review completed intake answers, confirm consent before text drafting, and route qualified leads to the appropriate agent." },
  { id: "co-marketing-agents", label: "Co-branded agents", icon: Users, recommendation: "Review new Oregon sync updates, complete partner profiles, and schedule thoughtful outreach for active relationships." },
  { id: "loan-officers", label: "Loan officers", icon: Users, recommendation: "Keep profile and pairing details current so co-branded links and source attribution remain accurate." },
  { id: "saved-qualifying-listings", label: "Listings & property pages", icon: MapPinned, recommendation: "Review new snapshot listings, eligibility screens, and property-page opportunities before sharing any approved marketing." },
  { id: "texting-workspace", label: "Texting workspace", icon: MessageSquareText, recommendation: "Use only recorded consent, review the draft before sending, and log the outcome in the relevant lead record." },
  { id: "pairing-spend-tracker", label: "Spend tracker", icon: ReceiptText, recommendation: "Review shared spend, source tags, and the 40–60% allocation screen before changing campaign budgets." },
];

const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const numberFromInput = (value: string, fallback: number) => {
  const parsed = Number(value.replace(/[$,%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

function DashboardPaymentEstimator() {
  const [open, setOpen] = useState(true);
  const [price, setPrice] = useState("425000");
  const [downPaymentPercent, setDownPaymentPercent] = useState("3");
  const [annualRate, setAnnualRate] = useState("6.5");
  const [annualPropertyTax, setAnnualPropertyTax] = useState("0");
  const [annualHomeInsurance, setAnnualHomeInsurance] = useState("0");
  const [termYears, setTermYears] = useState<15 | 30>(30);
  const estimate = useMemo(() => estimateMonthlyHousingCost({ purchasePrice: numberFromInput(price, 0), downPaymentPercent: numberFromInput(downPaymentPercent, 0), annualRate: numberFromInput(annualRate, 0), annualPropertyTax: numberFromInput(annualPropertyTax, 0), annualHomeInsurance: numberFromInput(annualHomeInsurance, 0), termYears }), [annualHomeInsurance, annualPropertyTax, annualRate, downPaymentPercent, price, termYears]);

  return <section className="m-2 overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.035]" aria-label="Internal payment estimator">
    <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <Calculator className="h-4 w-4 text-primary" /><span className="min-w-0 flex-1 text-sm font-semibold text-foreground">Quick payment estimate</span>{open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
    {open && <div className="border-t border-primary/15 px-3 pb-3 pt-2.5">
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Price<Input aria-label="Internal estimate home price" className="h-8 text-xs" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Down %<Input aria-label="Internal estimate down payment percentage" className="h-8 text-xs" inputMode="decimal" value={downPaymentPercent} onChange={(event) => setDownPaymentPercent(event.target.value)} /></label>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Rate %<Input aria-label="Internal estimate annual rate" className="h-8 text-xs" inputMode="decimal" value={annualRate} onChange={(event) => setAnnualRate(event.target.value)} /></label>
        <div className="grid gap-1 text-[11px] font-medium text-muted-foreground"><span>Term</span><div className="flex rounded-md border border-input p-0.5"><Button type="button" size="sm" variant={termYears === 30 ? "default" : "ghost"} className="h-6 flex-1 px-1 text-[11px]" onClick={() => setTermYears(30)} aria-pressed={termYears === 30}>30 yr</Button><Button type="button" size="sm" variant={termYears === 15 ? "default" : "ghost"} className="h-6 flex-1 px-1 text-[11px]" onClick={() => setTermYears(15)} aria-pressed={termYears === 15}>15 yr</Button></div></div>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Property tax / yr<Input aria-label="Internal estimate annual property tax" className="h-8 text-xs" inputMode="decimal" value={annualPropertyTax} onChange={(event) => setAnnualPropertyTax(event.target.value)} /></label>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Home insurance / yr<Input aria-label="Internal estimate annual home insurance" className="h-8 text-xs" inputMode="decimal" value={annualHomeInsurance} onChange={(event) => setAnnualHomeInsurance(event.target.value)} /></label>
      </div>
      <div className="mt-3 rounded-lg border border-border bg-card p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Estimated total monthly payment</p><p className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(estimate.estimatedTotalMonthlyPayment)}</p><div className="mt-2 grid grid-cols-3 gap-2 text-[10px]"><p className="text-muted-foreground">P&amp;I<span className="mt-0.5 block font-semibold tabular-nums text-foreground">{formatCurrency(estimate.monthlyPayment)}</span></p><p className="text-muted-foreground">Tax / mo<span className="mt-0.5 block font-semibold tabular-nums text-foreground">{formatCurrency(estimate.monthlyPropertyTax)}</span></p><p className="text-muted-foreground">Insurance / mo<span className="mt-0.5 block font-semibold tabular-nums text-foreground">{formatCurrency(estimate.monthlyHomeInsurance)}</span></p></div><div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2 text-[11px]"><p className="text-muted-foreground">Loan amount<span className="mt-0.5 block font-semibold tabular-nums text-foreground">{formatCurrency(estimate.loanAmount)}</span></p><p className="text-muted-foreground">Term interest<span className="mt-0.5 block font-semibold tabular-nums text-foreground">{formatCurrency(estimate.totalInterest)}</span></p></div></div>
      <p className="mt-2 text-[10px] leading-4 text-muted-foreground">Internal planning estimate only. The total includes P&amp;I plus the annual property tax and homeowners insurance amounts you enter; confirm pricing, fees, mortgage insurance, HOA dues, and final loan terms before communicating a quote.</p>
    </div>}
  </section>;
}

export function DashboardWorkdaySidebar({ records }: { records: WorkflowRecord[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const [openSectionId, setOpenSectionId] = useState<string>("campaign-funnel");
  const [reviewSection, setReviewSection] = useState<WorkflowSection | null>(null);
  const review = trpc.workflowAi.review.useMutation();
  const reviewRecords = useMemo(() => records.slice(0, 10), [records]);

  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const requestReview = (section: WorkflowSection) => {
    setReviewSection(section);
    review.mutate({ section: section.id, records: reviewRecords });
  };

  return (
    <aside className={`sticky top-20 z-30 h-[calc(100vh-6.25rem)] shrink-0 self-start overflow-hidden rounded-2xl border border-primary/20 bg-card/95 shadow-sm backdrop-blur transition-[width] duration-200 ${collapsed ? "w-14" : "w-full lg:w-80"}`} aria-label="Daily workday workflow">
      <div className="flex h-14 items-center justify-between border-b border-border px-3">
        {!collapsed && <div className="flex min-w-0 items-center gap-2"><Workflow className="h-4 w-4 shrink-0 text-primary" /><span className="truncate text-sm font-semibold">Daily workday flow</span></div>}
        <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand workday sidebar" : "Collapse workday sidebar"}>{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button>
      </div>

      {collapsed ? <div className="flex flex-col items-center gap-3 py-4">{SECTIONS.slice(0, 7).map((section) => { const Icon = section.icon; return <button key={section.id} type="button" className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title={section.label} onClick={() => { setCollapsed(false); setOpenSectionId(section.id); }}><Icon className="h-4 w-4" /></button>; })}</div> : <div className="h-[calc(100%-3.5rem)] overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
        <div className="border-b border-border bg-primary/[0.035] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Pinned daily route</p>
          <ol className="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground">
            <li><span className="font-semibold text-foreground">1.</span> Work new ad and Roadmap leads.</li>
            <li><span className="font-semibold text-foreground">2.</span> Review completed chat intakes and consent.</li>
            <li><span className="font-semibold text-foreground">3.</span> Route agent, listing, and property-page follow-ups.</li>
            <li><span className="font-semibold text-foreground">4.</span> Review funnel results and shared spend before close.</li>
          </ol>
        </div>

        <DashboardPaymentEstimator />

        <div className="p-2">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const open = openSectionId === section.id;
            return <div key={section.id} className="border-b border-border/70 last:border-0">
              <div className="flex items-center gap-1 py-2">
                <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setOpenSectionId(open ? "" : section.id)} aria-expanded={open}>
                  <Icon className="h-4 w-4 shrink-0 text-primary" /> <span className="truncate">{section.label}</span>{open ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
                </button>
              </div>
              {open && <div className="px-2 pb-3">
                <p className="text-xs leading-5 text-muted-foreground">{section.recommendation}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={() => jumpTo(section.id)}>Open section</Button>
                  <Button size="sm" className="h-7 flex-1 text-xs" onClick={() => requestReview(section)} disabled={review.isPending}><Sparkles className="mr-1 h-3.5 w-3.5" /> AI review</Button>
                </div>
              </div>}
            </div>;
          })}
        </div>

        {reviewSection && <div className="m-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-3" aria-live="polite">
          <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-foreground">{reviewSection.label}: today’s focus</p><button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setReviewSection(null)}>Close</button></div>
          {review.isPending ? <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reviewing current private dashboard data…</div> : review.isError ? <p className="mt-2 text-xs text-destructive">Couldn’t complete the review. Try again.</p> : review.data ? <><p className="mt-2 text-xs font-medium text-foreground">{review.data.headline}</p><ol className="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground">{review.data.actions.map((action: { title: string; detail: string }, index: number) => <li key={`${action.title}-${index}`}><span className="font-semibold text-foreground">{index + 1}. {action.title}</span><br />{action.detail}</li>)}</ol><p className="mt-2 text-[11px] text-muted-foreground">Internal workflow guidance only. Review before taking any action.</p></> : null}
        </div>}
      </div>}
    </aside>
  );
}
