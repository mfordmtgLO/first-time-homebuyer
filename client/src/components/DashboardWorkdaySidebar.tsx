import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { estimateMonthlyHousingCost } from "@shared/mortgageEstimator";
import { Calculator, Download, Loader2, PanelLeftClose, PanelLeftOpen, Sparkles, ChevronDown, ChevronRight, Workflow, Target, Users, MapPinned, MessageSquareText, ReceiptText, Megaphone, BookOpenCheck } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { BrowserLeadTracker, DashboardAffordabilityEstimator, type SavedMortgageQuoteRecord } from "@/components/DashboardBrowserTools";

type WorkflowRecord = { label: string; status: string; meta: string };
type SavedMortgageQuote = SavedMortgageQuoteRecord;

type DashboardWorkdaySidebarProps = {
  records: WorkflowRecord[];
  onLeadSourceSelect?: (source: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
};

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
const toCents = (value: string) => Math.round(Math.max(numberFromInput(value, 0), 0) * 100);
const quoteTotal = (quote: { purchasePriceCents: number; downPaymentPercentBasisPoints: number; annualRateBasisPoints: number; termYears: number; annualPropertyTaxCents: number; annualHomeInsuranceCents: number; monthlyHoaDuesCents: number; monthlyMortgageInsuranceCents: number }) => estimateMonthlyHousingCost({ purchasePrice: quote.purchasePriceCents / 100, downPaymentPercent: quote.downPaymentPercentBasisPoints / 100, annualRate: quote.annualRateBasisPoints / 100, termYears: quote.termYears, annualPropertyTax: quote.annualPropertyTaxCents / 100, annualHomeInsurance: quote.annualHomeInsuranceCents / 100, monthlyHoaDues: quote.monthlyHoaDuesCents / 100, monthlyMortgageInsurance: quote.monthlyMortgageInsuranceCents / 100 }).estimatedTotalMonthlyPayment;

function downloadSavedQuoteReport(quotes: SavedMortgageQuote[]) {
  const report = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = report.internal.pageSize.getWidth();
  const pageHeight = report.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 56;
  const line = (value: string, size: number, color: [number, number, number], gap = 8) => {
    report.setFontSize(size); report.setTextColor(...color);
    const wrapped = report.splitTextToSize(value, contentWidth) as string[];
    if (cursorY + wrapped.length * (size + 4) > pageHeight - margin) { report.addPage(); cursorY = margin; }
    report.text(wrapped, margin, cursorY); cursorY += wrapped.length * (size + 4) + gap;
  };
  report.setFillColor(9, 71, 52); report.rect(0, 0, pageWidth, 28, "F");
  line("Saved Mortgage Payment Scenario Comparison", 20, [9, 71, 52], 5);
  line(`Private owner planning report · Generated ${new Date().toLocaleDateString("en-US")}`, 9, [89, 89, 89], 16);
  quotes.forEach((quote, index) => {
    const estimate = estimateMonthlyHousingCost({ purchasePrice: quote.purchasePriceCents / 100, downPaymentPercent: quote.downPaymentPercentBasisPoints / 100, annualRate: quote.annualRateBasisPoints / 100, termYears: quote.termYears, annualPropertyTax: quote.annualPropertyTaxCents / 100, annualHomeInsurance: quote.annualHomeInsuranceCents / 100, monthlyHoaDues: quote.monthlyHoaDuesCents / 100, monthlyMortgageInsurance: quote.monthlyMortgageInsuranceCents / 100 });
    line(`${index + 1}. ${quote.name}`, 13, [9, 71, 52], 3);
    line(`${formatCurrency(quote.purchasePriceCents / 100)} purchase · ${quote.downPaymentPercentBasisPoints / 100}% down · ${quote.annualRateBasisPoints / 100}% estimated rate · ${quote.termYears}-year term`, 10, [35, 35, 35], 3);
    line(`Estimated monthly total: ${formatCurrency(estimate.estimatedTotalMonthlyPayment)}  |  P&I ${formatCurrency(estimate.monthlyPayment)}  |  Tax ${formatCurrency(estimate.monthlyPropertyTax)}  |  Insurance ${formatCurrency(estimate.monthlyHomeInsurance)}  |  HOA ${formatCurrency(estimate.monthlyHoaDues)}  |  Mortgage insurance ${formatCurrency(estimate.monthlyMortgageInsurance)}`, 9, [68, 78, 72], 13);
  });
  line("For internal planning only. This report is not a payment quote, APR quote, loan estimate, approval, commitment to lend, or offer of credit. Confirm pricing, fees, taxes, insurance, HOA, mortgage insurance, points, closing costs, and final loan terms before communicating any figures.", 8, [89, 89, 89], 0);
  report.save("saved-mortgage-payment-scenarios.pdf");
}

function DashboardPaymentEstimator({ onQuoteLoaded }: { onQuoteLoaded?: (quote: SavedMortgageQuote) => void }) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("425000");
  const [downPaymentPercent, setDownPaymentPercent] = useState("3");
  const [annualRate, setAnnualRate] = useState("6.5");
  const [annualPropertyTax, setAnnualPropertyTax] = useState("0");
  const [annualHomeInsurance, setAnnualHomeInsurance] = useState("0");
  const [monthlyHoaDues, setMonthlyHoaDues] = useState("0");
  const [monthlyMortgageInsurance, setMonthlyMortgageInsurance] = useState("0");
  const [quoteName, setQuoteName] = useState("New payment scenario");
  const [borrowerFirstName, setBorrowerFirstName] = useState("");
  const [borrowerLastName, setBorrowerLastName] = useState("");
  const [program, setProgram] = useState<SavedMortgageQuote["program"]>("conventional");
  const [searchFirstName, setSearchFirstName] = useState("");
  const [searchLastName, setSearchLastName] = useState("");
  const [searchProgram, setSearchProgram] = useState<SavedMortgageQuote["program"] | "all">("all");
  const [maxPriceCeiling, setMaxPriceCeiling] = useState("600000");
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [editingQuoteName, setEditingQuoteName] = useState("");
  const [termYears, setTermYears] = useState<15 | 30>(30);
  const quoteUtils = trpc.useUtils();
  const savedQuotes = trpc.mortgageQuotes.list.useQuery();
  const saveQuote = trpc.mortgageQuotes.create.useMutation({ onSuccess: () => { quoteUtils.mortgageQuotes.list.invalidate(); toast.success("Payment quote saved."); }, onError: () => toast.error("Couldn’t save this payment quote.") });
  const filteredSavedQuotes = useMemo(() => {
    const first = searchFirstName.trim().toLowerCase();
    const last = searchLastName.trim().toLowerCase();
    const maxCents = toCents(maxPriceCeiling);
    return (savedQuotes.data ?? []).filter((quote) => {
      const effectiveMax = quote.maxPurchasePriceResultCents || quote.purchasePriceCents;
      return (!first || (quote.firstName ?? "").toLowerCase().includes(first)) && (!last || (quote.lastName ?? "").toLowerCase().includes(last)) && (searchProgram === "all" || (quote.program ?? "conventional") === searchProgram) && effectiveMax <= maxCents;
    });
  }, [maxPriceCeiling, savedQuotes.data, searchFirstName, searchLastName, searchProgram]);
  const removeQuote = trpc.mortgageQuotes.delete.useMutation({ onSuccess: () => { quoteUtils.mortgageQuotes.list.invalidate(); toast.success("Saved quote deleted."); }, onError: () => toast.error("Couldn’t remove this saved scenario.") });
  const renameQuote = trpc.mortgageQuotes.updateName.useMutation({ onSuccess: () => { quoteUtils.mortgageQuotes.list.invalidate(); setEditingQuoteId(null); setEditingQuoteName(""); toast.success("Saved quote renamed."); }, onError: () => toast.error("Couldn’t rename this saved quote.") });
  const estimate = useMemo(() => estimateMonthlyHousingCost({ purchasePrice: numberFromInput(price, 0), downPaymentPercent: numberFromInput(downPaymentPercent, 0), annualRate: numberFromInput(annualRate, 0), annualPropertyTax: numberFromInput(annualPropertyTax, 0), annualHomeInsurance: numberFromInput(annualHomeInsurance, 0), monthlyHoaDues: numberFromInput(monthlyHoaDues, 0), monthlyMortgageInsurance: numberFromInput(monthlyMortgageInsurance, 0), termYears }), [annualHomeInsurance, annualPropertyTax, annualRate, downPaymentPercent, monthlyHoaDues, monthlyMortgageInsurance, price, termYears]);
  const saveCurrentQuote = () => saveQuote.mutate({ name: quoteName.trim() || "New payment scenario", firstName: borrowerFirstName.trim(), lastName: borrowerLastName.trim(), program: program ?? "conventional", purchasePriceCents: toCents(price), downPaymentPercentBasisPoints: Math.round(Math.max(numberFromInput(downPaymentPercent, 0), 0) * 100), annualRateBasisPoints: Math.round(Math.max(numberFromInput(annualRate, 0), 0) * 100), termYears, annualPropertyTaxCents: toCents(annualPropertyTax), annualHomeInsuranceCents: toCents(annualHomeInsurance), monthlyHoaDuesCents: toCents(monthlyHoaDues), monthlyMortgageInsuranceCents: toCents(monthlyMortgageInsurance), maxPurchasePriceResultCents: toCents(price) });
  const loadSavedQuote = (quote: NonNullable<typeof savedQuotes.data>[number]) => { setOpen(true); setQuoteName(quote.name); setBorrowerFirstName(quote.firstName ?? ""); setBorrowerLastName(quote.lastName ?? ""); setProgram(quote.program ?? "conventional"); setPrice(String(quote.purchasePriceCents / 100)); setDownPaymentPercent(String(quote.downPaymentPercentBasisPoints / 100)); setAnnualRate(String(quote.annualRateBasisPoints / 100)); setTermYears(quote.termYears as 15 | 30); setAnnualPropertyTax(String(quote.annualPropertyTaxCents / 100)); setAnnualHomeInsurance(String(quote.annualHomeInsuranceCents / 100)); setMonthlyHoaDues(String(quote.monthlyHoaDuesCents / 100)); setMonthlyMortgageInsurance(String(quote.monthlyMortgageInsuranceCents / 100)); onQuoteLoaded?.(quote); toast.success(`Loaded ${quote.name}.`); };
  const copySavedQuoteSummary = async (quote: SavedMortgageQuote) => {
    const effectiveMax = quote.maxPurchasePriceResultCents || quote.purchasePriceCents;
    const summary = `${quote.name}\n${quote.firstName || quote.lastName ? `Borrower: ${`${quote.firstName ?? ""} ${quote.lastName ?? ""}`.trim()}\n` : ""}Program: ${(quote.program ?? "conventional").toUpperCase()}\nMaximum purchase price: ${formatCurrency(effectiveMax / 100)}\nEstimated monthly total: ${formatCurrency(quoteTotal(quote))}\nPurchase price: ${formatCurrency(quote.purchasePriceCents / 100)} · ${quote.downPaymentPercentBasisPoints / 100}% down · ${quote.annualRateBasisPoints / 100}% estimated rate · ${quote.termYears}-year term\n\nInternal planning estimate only—not an approval, underwriting decision, loan quote, APR, or commitment to lend.`;
    try { await navigator.clipboard.writeText(summary); toast.success("Quote summary copied."); } catch { toast.error("Couldn’t copy the quote summary."); }
  };
  const beginRename = (quote: SavedMortgageQuote) => { setEditingQuoteId(quote.id); setEditingQuoteName(quote.name); };
  const saveRenamedQuote = (quote: SavedMortgageQuote) => { const name = editingQuoteName.trim(); if (!name) { toast.error("Enter a quote name."); return; } renameQuote.mutate({ id: quote.id, name }); };

  return <section className="m-2 overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.035]" aria-label="Internal payment estimator">
    <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <Calculator className="h-4 w-4 text-primary" /><span className="min-w-0 flex-1 text-sm font-semibold text-foreground">Quick payment estimate</span>{open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
    {open && <div className="border-t border-primary/15 px-3 pb-3 pt-2.5">
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 grid gap-1 text-[11px] font-medium text-muted-foreground">Loan program<select aria-label="Saved quote loan program" value={program ?? "conventional"} onChange={(event) => setProgram(event.target.value as SavedMortgageQuote["program"])} className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"><option value="conventional">Conventional</option><option value="fha">FHA</option><option value="usda">USDA RD</option><option value="va">VA</option><option value="nonqm">NonQM</option></select></label>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Borrower first name<Input aria-label="Saved quote borrower first name" className="h-8 text-xs" value={borrowerFirstName} onChange={(event) => setBorrowerFirstName(event.target.value)} /></label>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Borrower last name<Input aria-label="Saved quote borrower last name" className="h-8 text-xs" value={borrowerLastName} onChange={(event) => setBorrowerLastName(event.target.value)} /></label>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Price<Input aria-label="Internal estimate home price" className="h-8 text-xs" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Down %<Input aria-label="Internal estimate down payment percentage" className="h-8 text-xs" inputMode="decimal" value={downPaymentPercent} onChange={(event) => setDownPaymentPercent(event.target.value)} /></label>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Rate %<Input aria-label="Internal estimate annual rate" className="h-8 text-xs" inputMode="decimal" value={annualRate} onChange={(event) => setAnnualRate(event.target.value)} /></label>
        <div className="grid gap-1 text-[11px] font-medium text-muted-foreground"><span>Term</span><div className="flex rounded-md border border-input p-0.5"><Button type="button" size="sm" variant={termYears === 30 ? "default" : "ghost"} className="h-6 flex-1 px-1 text-[11px]" onClick={() => setTermYears(30)} aria-pressed={termYears === 30}>30 yr</Button><Button type="button" size="sm" variant={termYears === 15 ? "default" : "ghost"} className="h-6 flex-1 px-1 text-[11px]" onClick={() => setTermYears(15)} aria-pressed={termYears === 15}>15 yr</Button></div></div>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Property tax / yr<Input aria-label="Internal estimate annual property tax" className="h-8 text-xs" inputMode="decimal" value={annualPropertyTax} onChange={(event) => setAnnualPropertyTax(event.target.value)} /></label>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Home insurance / yr<Input aria-label="Internal estimate annual home insurance" className="h-8 text-xs" inputMode="decimal" value={annualHomeInsurance} onChange={(event) => setAnnualHomeInsurance(event.target.value)} /></label>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">HOA dues / mo<Input aria-label="Internal estimate monthly HOA dues" className="h-8 text-xs" inputMode="decimal" value={monthlyHoaDues} onChange={(event) => setMonthlyHoaDues(event.target.value)} /></label>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Mortgage insurance / mo<Input aria-label="Internal estimate monthly mortgage insurance" className="h-8 text-xs" inputMode="decimal" value={monthlyMortgageInsurance} onChange={(event) => setMonthlyMortgageInsurance(event.target.value)} /></label>
      </div>
      <div className="mt-3 rounded-lg border border-border bg-card p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Estimated total monthly payment</p><p className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(estimate.estimatedTotalMonthlyPayment)}</p><div className="mt-2 grid grid-cols-3 gap-2 text-[10px]"><p className="text-muted-foreground">P&amp;I<span className="mt-0.5 block font-semibold tabular-nums text-foreground">{formatCurrency(estimate.monthlyPayment)}</span></p><p className="text-muted-foreground">Tax / mo<span className="mt-0.5 block font-semibold tabular-nums text-foreground">{formatCurrency(estimate.monthlyPropertyTax)}</span></p><p className="text-muted-foreground">Insurance / mo<span className="mt-0.5 block font-semibold tabular-nums text-foreground">{formatCurrency(estimate.monthlyHomeInsurance)}</span></p><p className="text-muted-foreground">HOA / mo<span className="mt-0.5 block font-semibold tabular-nums text-foreground">{formatCurrency(estimate.monthlyHoaDues)}</span></p><p className="col-span-2 text-muted-foreground">Mortgage insurance / mo<span className="mt-0.5 block font-semibold tabular-nums text-foreground">{formatCurrency(estimate.monthlyMortgageInsurance)}</span></p></div><div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2 text-[11px]"><p className="text-muted-foreground">Loan amount<span className="mt-0.5 block font-semibold tabular-nums text-foreground">{formatCurrency(estimate.loanAmount)}</span></p><p className="text-muted-foreground">Term interest<span className="mt-0.5 block font-semibold tabular-nums text-foreground">{formatCurrency(estimate.totalInterest)}</span></p></div></div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2"><Input aria-label="Saved quote name" className="h-8 text-xs" value={quoteName} onChange={(event) => setQuoteName(event.target.value)} /><Button type="button" size="sm" className="h-8 text-xs" onClick={saveCurrentQuote} disabled={saveQuote.isPending}>{saveQuote.isPending ? "Saving…" : "Save Quote"}</Button></div>
      <div className="mt-2 rounded-lg border border-border/80 bg-muted/25 p-2"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Saved scenario comparison</p><Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => { if (!savedQuotes.data?.length) return; try { downloadSavedQuoteReport(savedQuotes.data); toast.success("Saved quote report is downloading."); } catch { toast.error("Couldn’t prepare the saved quote report."); } }} disabled={!savedQuotes.data?.length}><Download className="mr-1 h-3 w-3" />PDF</Button></div><div className="mt-2 grid grid-cols-2 gap-2"><Input aria-label="Search saved quotes by first name" placeholder="First name" className="h-7 text-[10px]" value={searchFirstName} onChange={(event) => setSearchFirstName(event.target.value)} /><Input aria-label="Search saved quotes by last name" placeholder="Last name" className="h-7 text-[10px]" value={searchLastName} onChange={(event) => setSearchLastName(event.target.value)} /><select aria-label="Filter saved quotes by loan program" value={searchProgram} onChange={(event) => setSearchProgram(event.target.value as SavedMortgageQuote["program"] | "all")} className="h-7 rounded-md border border-input bg-background px-2 text-[10px] text-foreground"><option value="all">All programs</option><option value="conventional">Conventional</option><option value="fha">FHA</option><option value="usda">USDA RD</option><option value="va">VA</option><option value="nonqm">NonQM</option></select><label className="grid gap-0.5 text-[9px] font-medium text-muted-foreground">Max price ≤ {formatCurrency(toCents(maxPriceCeiling) / 100)}<input aria-label="Maximum saved quote purchase price" type="range" min="0" max="2000000" step="25000" value={Math.min(Math.max(Number(maxPriceCeiling) || 0, 0), 2000000)} onChange={(event) => setMaxPriceCeiling(event.target.value)} className="h-6 w-full accent-primary" /></label></div>{savedQuotes.isLoading ? <p className="mt-2 text-[11px] text-muted-foreground">Loading saved quotes…</p> : savedQuotes.data?.length ? <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">{filteredSavedQuotes.map((quote) => <div key={quote.id} className="rounded-md border border-border bg-card p-2"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-foreground">{quote.name}</p><p className="text-[10px] text-muted-foreground">{quote.firstName || quote.lastName ? `${quote.firstName ?? ""} ${quote.lastName ?? ""}`.trim() + " · " : ""}{(quote.program ?? "conventional").toUpperCase()} · Max {formatCurrency((quote.maxPurchasePriceResultCents || quote.purchasePriceCents) / 100)}</p><p className="text-[10px] text-muted-foreground">{formatCurrency(quote.purchasePriceCents / 100)} · {quote.annualRateBasisPoints / 100}% · {quote.termYears} yr</p></div><div className="flex shrink-0 flex-wrap justify-end gap-1"><Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => beginRename(quote)}>Edit Name</Button><Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-destructive" onClick={() => removeQuote.mutate({ id: quote.id })} disabled={removeQuote.isPending}>Delete</Button></div></div><div className="mt-1 flex flex-wrap items-center justify-between gap-1.5"><span className="text-[11px] font-semibold tabular-nums text-foreground">{formatCurrency(quoteTotal(quote))}/mo</span><div className="flex flex-wrap justify-end gap-1"><Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => loadSavedQuote(quote)}>Load inputs</Button><Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => void copySavedQuoteSummary(quote)}>Copy Summary</Button></div></div>{editingQuoteId === quote.id && <div className="mt-1.5 flex items-center gap-1.5"><Input aria-label={`Edit saved quote name ${quote.name}`} className="h-7 min-w-0 text-[10px]" value={editingQuoteName} onChange={(event) => setEditingQuoteName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveRenamedQuote(quote); if (event.key === "Escape") { setEditingQuoteId(null); setEditingQuoteName(""); } }} /><Button type="button" size="sm" className="h-7 px-1.5 text-[10px]" onClick={() => saveRenamedQuote(quote)} disabled={renameQuote.isPending}>Save</Button></div>}</div>)}</div> : <p className="mt-2 text-[11px] text-muted-foreground">{savedQuotes.data?.length ? "No saved quotes match these filters." : "Save scenarios here to compare their all-in monthly totals."}</p>}</div>
      <p className="mt-2 text-[10px] leading-4 text-muted-foreground">Internal planning estimate only. The total includes P&amp;I, annual property tax, homeowners insurance, HOA dues, and mortgage insurance you enter; confirm pricing, fees, and final loan terms before communicating a quote.</p>
    </div>}
  </section>;
}

export function DashboardWorkdaySidebar({ records, onLeadSourceSelect, collapsed: collapsedProp, onCollapsedChange }: DashboardWorkdaySidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = collapsedProp ?? internalCollapsed;
  const setCollapsed = (next: boolean) => {
    if (collapsedProp === undefined) setInternalCollapsed(next);
    onCollapsedChange?.(next);
  };
  const [openSectionId, setOpenSectionId] = useState<string>("campaign-funnel");
  const [quoteToLoad, setQuoteToLoad] = useState<SavedMortgageQuote | null>(null);
  const [reviewSection, setReviewSection] = useState<WorkflowSection | null>(null);
  const workflowUtils = trpc.useUtils();
  const reviewHistory = trpc.workflowAi.listHistory.useQuery({ limit: 8 });
  const review = trpc.workflowAi.review.useMutation({ onSuccess: () => workflowUtils.workflowAi.listHistory.invalidate() });
  const updateReviewOutcome = trpc.workflowAi.updateOutcome.useMutation({ onSuccess: () => workflowUtils.workflowAi.listHistory.invalidate(), onError: () => toast.error("Couldn’t save recommendation feedback.") });
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
        <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand workday sidebar" : "Collapse workday sidebar"}>{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button>
      </div>

      {collapsed ? <div className="flex flex-col items-center gap-3 py-4">{SECTIONS.slice(0, 7).map((section) => { const Icon = section.icon; return <button key={section.id} type="button" className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title={section.label} onClick={() => { setCollapsed(false); setOpenSectionId(section.id); }}><Icon className="h-4 w-4" /></button>; })}</div> : <div className="h-[calc(100%-3.5rem)] overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
        <BrowserLeadTracker onLeadSourceSelect={onLeadSourceSelect} onClearFilters={() => onLeadSourceSelect?.("all")} />
        <div className="border-b border-border bg-primary/[0.035] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Pinned daily route</p>
          <ol className="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground">
            <li><span className="font-semibold text-foreground">1.</span> Work new ad and Roadmap leads.</li>
            <li><span className="font-semibold text-foreground">2.</span> Review completed chat intakes and consent.</li>
            <li><span className="font-semibold text-foreground">3.</span> Route agent, listing, and property-page follow-ups.</li>
            <li><span className="font-semibold text-foreground">4.</span> Review funnel results and shared spend before close.</li>
          </ol>
        </div>

        <DashboardPaymentEstimator onQuoteLoaded={setQuoteToLoad} />
        <DashboardAffordabilityEstimator quoteToLoad={quoteToLoad} />

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
        <div className="m-2 rounded-lg border border-border bg-muted/20 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">AI review history &amp; owner feedback</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">Private review snapshots only. Feedback records your outcome; it does not automatically train or send anything.</p>{reviewHistory.isLoading ? <p className="mt-2 text-[11px] text-muted-foreground">Loading review history…</p> : reviewHistory.data?.length ? <div className="mt-2 max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">{reviewHistory.data.map((item) => <div key={item.id} className="rounded-md border border-border bg-card p-2"><p className="text-[11px] font-semibold text-foreground">{item.section.replaceAll("-", " ")}</p><p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{item.headline}</p><div className="mt-2 flex flex-wrap gap-1"><Button type="button" size="sm" variant={item.status === "completed" ? "default" : "outline"} className="h-6 px-1.5 text-[10px]" onClick={() => updateReviewOutcome.mutate({ id: item.id, status: "completed", feedback: item.feedback ?? "useful" })}>Completed</Button><Button type="button" size="sm" variant={item.feedback === "useful" ? "default" : "outline"} className="h-6 px-1.5 text-[10px]" onClick={() => updateReviewOutcome.mutate({ id: item.id, status: item.status, feedback: "useful" })}>Useful</Button><Button type="button" size="sm" variant={item.feedback === "needs_tuning" ? "default" : "outline"} className="h-6 px-1.5 text-[10px]" onClick={() => updateReviewOutcome.mutate({ id: item.id, status: item.status, feedback: "needs_tuning" })}>Needs tuning</Button><Button type="button" size="sm" variant={item.feedback === "not_useful" ? "default" : "outline"} className="h-6 px-1.5 text-[10px]" onClick={() => updateReviewOutcome.mutate({ id: item.id, status: "deferred", feedback: "not_useful" })}>Not useful</Button></div></div>)}</div> : <p className="mt-2 text-[11px] text-muted-foreground">Run an AI review to begin a private, owner-controlled outcome history.</p>}</div>
      </div>}
    </aside>
  );
}
