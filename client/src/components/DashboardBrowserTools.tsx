import { useMemo, useState } from "react";
import { BarChart3, ChevronDown, ChevronRight, Info, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

type ProgramKey = "conventional" | "fha" | "usda" | "va" | "nonqm";
const PROGRAMS: Record<ProgramKey, { label: string; dti: number; minScore: number }> = {
  conventional: { label: "Conventional", dti: 0.50, minScore: 680 },
  fha: { label: "FHA", dti: 0.57, minScore: 580 },
  usda: { label: "USDA RD", dti: 0.445, minScore: 680 },
  va: { label: "VA", dti: 0.64, minScore: 620 },
  nonqm: { label: "NonQM", dti: 0.43, minScore: 700 },
};

function monthlyPrincipalInterest(principal: number, annualRate: number, termYears: number) {
  const months = termYears * 12;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * ((monthlyRate * factor) / (factor - 1));
}

export function BrowserLeadTracker() {
  const leads = trpc.leads.list.useQuery();
  const chats = trpc.chat.list.useQuery();
  const counts = useMemo(() => {
    const roadmap = leads.data ?? [];
    const chat = chats.data ?? [];
    const mobile = roadmap.filter((lead) => lead.captureDevice === "mobile").length + chat.filter((lead) => lead.captureDevice === "mobile").length;
    const desktop = roadmap.filter((lead) => lead.captureDevice !== "mobile").length + chat.filter((lead) => lead.captureDevice !== "mobile").length;
    return { mobile, desktop, total: mobile + desktop };
  }, [leads.data, chats.data]);
  const mobileShare = counts.total > 0 ? Math.round((counts.mobile / counts.total) * 100) : 0;

  return (
    <section className="sticky top-0 z-20 border-b border-primary/20 bg-card/95 p-3 shadow-sm backdrop-blur" aria-label="Desktop Browser versus Mobile Browser lead tracker">
      <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-wide text-primary">Browser lead mix</p><span className="ml-auto text-[10px] text-muted-foreground">All time</span></div>
      <div className="mt-2 flex items-end justify-between gap-2"><div><p className="text-[10px] font-semibold text-muted-foreground">Mobile Browser</p><p className="text-xl font-semibold tabular-nums text-foreground">{counts.mobile}</p></div><div className="text-right"><p className="text-[10px] font-semibold text-muted-foreground">Desktop Browser</p><p className="text-xl font-semibold tabular-nums text-foreground">{counts.desktop}</p></div></div>
      <div className="mt-2" role="img" aria-label={`Mobile Browser ${counts.mobile} leads versus Desktop Browser ${counts.desktop} leads`}>
        <div className="relative h-3 overflow-hidden rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500"><div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.45)]" style={{ left: `${mobileShare}%` }} /></div>
        <div className="mt-1 flex justify-between text-[9px] font-medium text-muted-foreground"><span>Mobile Browser</span><span>{mobileShare}% mobile · {100 - mobileShare}% desktop</span><span>Desktop Browser</span></div>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{counts.desktop}/{counts.mobile} desktop-to-mobile leads across Roadmap and Mortgage Chat. Legacy records without a mobile marker are counted as Desktop Browser.</p>
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
      <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">Loan program<select aria-label="Affordability loan program" value={program} onChange={(event) => setProgram(event.target.value as ProgramKey)} className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground">{Object.entries(PROGRAMS).map(([key, value]) => <option key={key} value={key}>{value.label} · {Math.round(value.dti * 1000) / 10}% DTI · {value.minScore} score</option>)}</select></label>
      <div className="mt-2 grid grid-cols-2 gap-2">{[["Credit score", creditScore, setCreditScore], ["Gross monthly income", income, setIncome], ["Monthly consumer debts", debts, setDebts], ["Property taxes / mo", taxes, setTaxes], ["Homeowners insurance / mo", insurance, setInsurance], ["Flood insurance / mo", floodInsurance, setFloodInsurance], ["HOA dues / mo", hoa, setHoa]].map(([label, value, setter]) => <label key={label as string} className="grid gap-1 text-[11px] font-medium text-muted-foreground">{label as string}<Input aria-label={label as string} className="h-8 text-xs" inputMode="decimal" value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} /></label>)}</div>
      <div className="mt-3 rounded-lg border border-border bg-card p-2.5"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Estimated maximum purchase price</p><p className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(result.maxPurchasePrice)}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${result.eligible ? "bg-emerald-600/10 text-emerald-700" : "bg-amber-600/10 text-amber-700"}`}>{result.eligible ? "Score meets screen" : "Score below screen"}</span></div><div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2 text-[10px] text-muted-foreground"><span>Max housing payment<strong className="mt-0.5 block text-foreground">{formatCurrency(result.maxHousingPayment)}</strong></span><span>Available P&amp;I<strong className="mt-0.5 block text-foreground">{formatCurrency(result.availablePrincipalAndInterest)}</strong></span></div></div>
      <div className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-muted-foreground"><Info className="mt-0.5 h-3 w-3 shrink-0" />Planning screen only: assumes 6.5% fixed rate, 30-year term, 3% down, and the selected program’s hardwired DTI/credit-screen assumptions. It is not an approval, underwriting decision, loan quote, APR, or commitment to lend. Confirm program guidelines, income, liabilities, taxes, insurance, HOA, rate, fees, and final terms with a licensed professional.</div>
    </div>}
  </section>;
}
