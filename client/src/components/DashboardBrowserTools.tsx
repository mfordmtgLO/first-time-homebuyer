import { useMemo, useState } from "react";
import { BarChart3, ChevronDown, ChevronRight, Info, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";

const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

type ProgramKey = "conventional" | "fha" | "usda" | "va" | "nonqm";
type Timeframe = "all" | "30d" | "year";
const PROGRAMS: Record<ProgramKey, { label: string; dti: number; minScore: number }> = {
  conventional: { label: "Conventional", dti: 0.50, minScore: 680 },
  fha: { label: "FHA", dti: 0.57, minScore: 580 },
  usda: { label: "USDA RD", dti: 0.445, minScore: 680 },
  va: { label: "VA", dti: 0.64, minScore: 620 },
  nonqm: { label: "NonQM", dti: 0.43, minScore: 700 },
};
const SOURCE_COLORS = ["#047857", "#0f766e", "#d97706", "#2563eb", "#9333ea", "#64748b"];

function monthlyPrincipalInterest(principal: number, annualRate: number, termYears: number) {
  const months = termYears * 12;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * ((monthlyRate * factor) / (factor - 1));
}

function inTimeframe(value: Date | number | string, timeframe: Timeframe) {
  if (timeframe === "all") return true;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return false;
  const now = new Date();
  if (timeframe === "30d") return timestamp >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
  return new Date(timestamp).getFullYear() === now.getFullYear();
}

function timeframeLabel(timeframe: Timeframe) {
  return timeframe === "30d" ? "Last 30 days" : timeframe === "year" ? "This year" : "All time";
}

export function BrowserLeadTracker() {
  const leads = trpc.leads.list.useQuery();
  const chats = trpc.chat.list.useQuery();
  const [timeframe, setTimeframe] = useState<Timeframe>("all");
  const filtered = useMemo(() => ({
    roadmap: (leads.data ?? []).filter((lead) => inTimeframe(lead.createdAt, timeframe)),
    chat: (chats.data ?? []).filter((lead) => inTimeframe(lead.createdAt, timeframe)),
  }), [leads.data, chats.data, timeframe]);
  const counts = useMemo(() => {
    const all = [...filtered.roadmap, ...filtered.chat];
    const mobile = all.filter((lead) => lead.captureDevice === "mobile").length;
    const desktop = all.length - mobile;
    return { mobile, desktop, total: all.length };
  }, [filtered]);
  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.roadmap.forEach((lead) => counts.set(lead.source || "Other", (counts.get(lead.source || "Other") ?? 0) + 1));
    filtered.chat.forEach(() => counts.set("Mortgage Chat", (counts.get("Mortgage Chat") ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);
  const mobileShare = counts.total > 0 ? Math.round((counts.mobile / counts.total) * 100) : 0;
  const pieGradient = useMemo(() => {
    if (sourceCounts.length === 0) return "#e5e7eb 0 100%";
    let cursor = 0;
    return sourceCounts.map(([_, count], index) => {
      const start = cursor;
      cursor += (count / counts.total) * 100;
      return `${SOURCE_COLORS[index % SOURCE_COLORS.length]} ${start}% ${cursor}%`;
    }).join(", ");
  }, [counts.total, sourceCounts]);

  return (
    <section className="sticky top-0 z-20 border-b border-primary/20 bg-card/95 p-3 shadow-sm backdrop-blur" aria-label="Desktop Browser versus Mobile Browser lead tracker">
      <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-wide text-primary">Browser lead mix</p><span className="ml-auto text-[10px] text-muted-foreground">{timeframeLabel(timeframe)}</span></div>
      <div className="mt-2 flex items-center gap-2">
        <label htmlFor="browser-lead-timeframe" className="sr-only">Browser lead metric timeframe</label>
        <select id="browser-lead-timeframe" value={timeframe} onChange={(event) => setTimeframe(event.target.value as Timeframe)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="all">All time</option><option value="30d">Last 30 days</option><option value="year">This year</option></select>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2"><div><p className="text-[10px] font-semibold text-muted-foreground">Mobile Browser</p><p className="text-xl font-semibold tabular-nums text-foreground">{counts.mobile}</p></div><div className="text-right"><p className="text-[10px] font-semibold text-muted-foreground">Desktop Browser</p><p className="text-xl font-semibold tabular-nums text-foreground">{counts.desktop}</p></div></div>
      <div className="mt-2" role="img" aria-label={`Mobile Browser ${counts.mobile} leads versus Desktop Browser ${counts.desktop} leads for ${timeframeLabel(timeframe)}`}><div className="relative h-3 overflow-hidden rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500"><div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.45)]" style={{ left: `${mobileShare}%` }} /></div><div className="mt-1 flex justify-between text-[9px] font-medium text-muted-foreground"><span>Mobile Browser</span><span>{mobileShare}% mobile · {100 - mobileShare}% desktop</span><span>Desktop Browser</span></div></div>
      <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{counts.desktop}/{counts.mobile} desktop-to-mobile leads for {timeframeLabel(timeframe)} across Roadmap and Mortgage Chat. Legacy records without a mobile marker are counted as Desktop Browser.</p>
      <div className="mt-3 border-t border-border pt-3" aria-label="Lead source breakdown"><div className="flex items-center gap-2"><div className="h-4 w-4 rounded-full" style={{ background: `conic-gradient(${pieGradient})` }} aria-hidden="true" /><p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Lead source mix</p></div>{sourceCounts.length === 0 ? <p className="mt-2 text-[10px] text-muted-foreground">No leads in this timeframe.</p> : <div className="mt-2 flex items-center gap-3"><div className="h-20 w-20 shrink-0 rounded-full" style={{ background: `conic-gradient(${pieGradient})` }} role="img" aria-label={`Lead source breakdown for ${timeframeLabel(timeframe)}`} /><div className="min-w-0 space-y-1">{sourceCounts.map(([source, count], index) => <div key={source} className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }} aria-hidden="true" /><span className="truncate">{source}</span><span className="ml-auto pl-2 font-semibold tabular-nums text-foreground">{count}</span></div>)}</div></div>}</div>
    </section>
  );
}

export function DashboardAffordabilityEstimator() {
  const [open, setOpen] = useState(false);
  const [program, setProgram] = useState<ProgramKey>("conventional");
  const [creditScore, setCreditScore] = useState("680");
  const [income, setIncome] = useState("8000");
  const [debts, setDebts] = useState("500");
  const [taxes, setTaxes] = useState("350");
  const [insurance, setInsurance] = useState("150");
  const [floodInsurance, setFloodInsurance] = useState("0");
  const [hoa, setHoa] = useState("0");
  const assumptions = PROGRAMS[program];
  const score = Math.max(0, Number(creditScore) || 0);
  const monthlyIncome = Math.max(0, Number(income) || 0);
  const monthlyDebts = Math.max(0, Number(debts) || 0);
  const monthlyExpenses = Math.max(0, Number(taxes) || 0) + Math.max(0, Number(insurance) || 0) + Math.max(0, Number(floodInsurance) || 0) + Math.max(0, Number(hoa) || 0);
  const result = useMemo(() => {
    const maxHousingPayment = Math.max(0, monthlyIncome * assumptions.dti - monthlyDebts);
    const availablePrincipalAndInterest = Math.max(0, maxHousingPayment - monthlyExpenses);
    const paymentFactor = monthlyPrincipalInterest(1, 6.5, 30);
    const maxLoan = paymentFactor > 0 ? availablePrincipalAndInterest / paymentFactor : 0;
    const maxPurchasePrice = maxLoan / 0.97;
    return { maxHousingPayment, availablePrincipalAndInterest, maxPurchasePrice, eligible: score >= assumptions.minScore };
  }, [assumptions.dti, assumptions.minScore, monthlyDebts, monthlyExpenses, monthlyIncome, score]);

  return <section className="m-2 overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.035]" aria-label="Internal affordability estimator">
    <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" onClick={() => setOpen((value) => !value)} aria-expanded={open}><ShieldCheck className="h-4 w-4 text-primary" /><span className="min-w-0 flex-1 text-sm font-semibold text-foreground">How much house can I afford?</span>{open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}</button>
    {open && <div className="border-t border-primary/15 px-3 pb-3 pt-2.5">
      <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Loan program<select aria-label="Affordability loan program" value={program} onChange={(event) => setProgram(event.target.value as ProgramKey)} className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground">{Object.entries(PROGRAMS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><Info className="h-3 w-3" aria-hidden="true" /><span title={`${assumptions.label}: ${Math.round(assumptions.dti * 1000) / 10}% total-debt-to-income screen and ${assumptions.minScore} minimum representative credit score.`}>{assumptions.label}: {Math.round(assumptions.dti * 1000) / 10}% DTI · {assumptions.minScore} minimum score</span></div>
      <div className="mt-2 grid grid-cols-2 gap-2">{[["Credit score", creditScore, setCreditScore], ["Gross monthly income", income, setIncome], ["Monthly consumer debts", debts, setDebts], ["Property taxes / mo", taxes, setTaxes], ["Homeowners insurance / mo", insurance, setInsurance], ["Flood insurance / mo", floodInsurance, setFloodInsurance], ["HOA dues / mo", hoa, setHoa]].map(([label, value, setter]) => <label key={label as string} className="grid gap-1 text-[11px] font-medium text-muted-foreground">{label as string}<Input aria-label={label as string} className="h-8 text-xs" inputMode="decimal" value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} /></label>)}</div>
      <div className="mt-3 rounded-lg border border-border bg-card p-2.5"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Estimated maximum purchase price</p><p className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(result.maxPurchasePrice)}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${result.eligible ? "bg-emerald-600/10 text-emerald-700" : "bg-amber-600/10 text-amber-700"}`}>{result.eligible ? "Score meets screen" : "Score below screen"}</span></div><div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2 text-[10px] text-muted-foreground"><span>Max housing payment<strong className="mt-0.5 block text-foreground">{formatCurrency(result.maxHousingPayment)}</strong></span><span>Available P&amp;I<strong className="mt-0.5 block text-foreground">{formatCurrency(result.availablePrincipalAndInterest)}</strong></span></div></div>
      <div className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-muted-foreground"><Info className="mt-0.5 h-3 w-3 shrink-0" />Planning screen only: assumes 6.5% fixed rate, 30-year term, 3% down, and the selected program’s hardwired DTI/credit-screen assumptions. It is not an approval, underwriting decision, loan quote, APR, or commitment to lend. Confirm program guidelines, income, liabilities, taxes, insurance, HOA, rate, fees, and final terms with a licensed professional.</div>
    </div>}
  </section>;
}
