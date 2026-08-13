/* GOLDEN HOUR PORCH — Cost of Waiting rent-vs-buy calculator, embedded in the MythBuster evergreen band */
import { useEffect, useMemo, useState } from "react";
import { computeCostOfWaiting } from "@shared/costOfWaiting";
import { useScenario } from "@/contexts/ScenarioContext";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, FileDown, Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

const fmtUsd = (v: number) =>
  v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const fmtUsdShort = (v: number) =>
  Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : fmtUsd(v);

const COLORS = {
  rent: "oklch(0.62 0.15 25)", // muted brick red — money gone
  equity: "oklch(0.72 0.13 75)", // honey amber — wealth built
};

/** Dark-band styled input block (the MythBuster section is deep evergreen). */
function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/60">
      {children}
    </label>
  );
}

/**
 * Info tooltip for calculator sliders: Oregon historical context.
 * Uses a Popover (click/tap) so it works on touch devices, with hover-open
 * affordance via the icon styling.
 */
function SliderInfo({
  ariaLabel,
  title,
  children,
}: {
  ariaLabel: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="inline-flex items-center justify-center rounded-full p-0.5 -my-0.5 text-white/50 transition-colors duration-150 hover:text-[oklch(0.78_0.13_75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-80 max-w-[calc(100vw-2rem)] border-white/15 bg-[oklch(0.24_0.04_155)] text-white shadow-xl"
      >
        <p className="font-display font-semibold text-sm">
          {title}
        </p>
        {children}
      </PopoverContent>
    </Popover>
  );
}

function RentHistoryInfo() {
  return (
    <SliderInfo ariaLabel="About Oregon rent increases" title="What's realistic for Oregon?">
        <p className="mt-1.5 text-xs leading-relaxed text-white/75">
          Oregon rents spiked by double digits in 2021–2022, then cooled — statewide
          median rent even dipped slightly in 2024–2025. Averaged across the last
          5 years, Oregon rent increases work out to roughly{" "}
          <span className="font-semibold text-[oklch(0.78_0.13_75)]">2–4% per year</span>{" "}
          statewide (Oregon Employment Dept. &amp; Apartment List data), though hot
          markets like Eugene have recently run above that.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-white/75">
          Oregon law also caps most annual increases at 7% + inflation (max{" "}
          <span className="font-semibold">9.5% in 2026</span>), so 10% is a true
          worst case. A setting of <span className="font-semibold">3%</span> is a
          reasonable long-run assumption.
        </p>
    </SliderInfo>
  );
}

function AppreciationHistoryInfo() {
  return (
    <SliderInfo
      ariaLabel="About Oregon home price appreciation"
      title="How fast do Oregon homes appreciate?"
    >
      <p className="mt-1.5 text-xs leading-relaxed text-white/75">
        Since 2000, Oregon home prices have appreciated about{" "}
        <span className="font-semibold text-[oklch(0.78_0.13_75)]">4.9% per year</span>{" "}
        on average (FHFA House Price Index) — a 26-year stretch spanning the
        2005–2007 and 2021–2022 booms (up to +20%/yr) and the 2009–2012 housing
        bust (as low as −10%/yr).
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-white/75">
        Recent years have cooled to roughly <span className="font-semibold">2–3%</span>,
        which is why this slider's 0–3% range is deliberately conservative —
        long-run history has actually run higher.
      </p>
    </SliderInfo>
  );
}

export default function CostOfWaiting() {
  const { setCowScenario, setCowAttached } = useScenario();
  const [waitYears, setWaitYears] = useState(3);
  const [monthlyRent, setMonthlyRent] = useState(1800);
  const [purchasePrice, setPurchasePrice] = useState(400000);
  const [downMode, setDownMode] = useState<"percent" | "dollar">("percent");
  const [downPct, setDownPct] = useState(0); // starts at zero down
  const [interestRate, setInterestRate] = useState(6.5);
  const [appreciation, setAppreciation] = useState(2);
  const [rentIncrease, setRentIncrease] = useState(3);

  const downDollars = useMemo(
    () => Math.round((purchasePrice * downPct) / 100),
    [purchasePrice, downPct]
  );

  const result = useMemo(
    () =>
      computeCostOfWaiting({
        waitYears,
        monthlyRent,
        purchasePrice,
        downPayment: downDollars,
        interestRate,
        appreciationRate: appreciation,
        rentIncreaseRate: rentIncrease,
      }),
    [waitYears, monthlyRent, purchasePrice, downDollars, interestRate, appreciation, rentIncrease]
  );

  // Keep the shared cost-of-waiting scenario in sync with the latest run so
  // the Roadmap form can attach it when the visitor opts in.
  useEffect(() => {
    setCowScenario({
      waitYears,
      monthlyRent,
      purchasePrice,
      downPayment: downDollars,
      interestRate,
      appreciationRate: appreciation,
      rentIncreaseRate: rentIncrease,
      monthlyPayment: Math.round(result.monthlyPayment),
      totalRentPaid: Math.round(result.totalRentPaid),
      equityGained: Math.round(Math.max(result.equityGained, 0)),
      costOfWaiting: Math.round(Math.max(result.costOfWaiting, 0)),
    });
  }, [waitYears, monthlyRent, purchasePrice, downDollars, interestRate, appreciation, rentIncrease, result, setCowScenario]);

  const attachAndGoToForm = () => {
    setCowAttached(true);
    document.getElementById("roadmap")?.scrollIntoView({ behavior: "smooth" });
  };

  const chartData = useMemo(
    () =>
      result.points.map((p) => ({
        label: `Year ${p.year}`,
        rent: Math.round(p.cumulativeRent),
        equity: Math.round(Math.max(p.equityGained, 0)),
      })),
    [result]
  );

  const handleDollarInput = (raw: string) => {
    const v = Number(raw.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(v)) return;
    const clamped = Math.min(Math.max(v, 0), purchasePrice);
    setDownPct(purchasePrice > 0 ? (clamped / purchasePrice) * 100 : 0);
  };

  return (
    <div className="mt-14 reveal rounded-lg border border-white/12 bg-white/[0.05] backdrop-blur-sm p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <span className="key-tag bg-white/10" style={{ color: "oklch(0.82 0.12 80)" }}>
            Run your own numbers
          </span>
          <h3 className="mt-3 font-display font-semibold text-2xl md:text-3xl text-white">
            What does waiting actually cost <em className="not-italic" style={{ color: "oklch(0.82 0.12 80)" }}>you</em>?
          </h3>
        </div>
        <p className="text-sm text-white/60 max-w-xs md:text-right">
          Rent paid vs. wealth built through home equity if you bought today.
        </p>
      </div>

      <div className="mt-8 grid lg:grid-cols-[minmax(290px,360px)_1fr] gap-8 items-start">
        {/* Inputs */}
        <div className="space-y-6">
          <div>
            <div className="flex items-baseline justify-between">
              <FieldLabel>If you wait…</FieldLabel>
              <span className="font-display font-semibold text-2xl text-white">
                {waitYears} {waitYears === 1 ? "year" : "years"}
              </span>
            </div>
            <Slider
              className="mt-3 cow-slider"
              value={[waitYears]}
              min={1}
              max={5}
              step={1}
              onValueChange={([v]) => setWaitYears(v)}
              aria-label="Years of waiting"
            />
            <div className="mt-1.5 flex justify-between text-[0.7rem] text-white/50">
              <span>1 yr</span>
              <span>5 yrs</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="cow-rent">Current rent /mo</FieldLabel>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">$</span>
                <Input
                  id="cow-rent"
                  inputMode="numeric"
                  className="pl-7 text-base font-semibold bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  value={monthlyRent.toLocaleString("en-US")}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(/[^0-9]/g, ""));
                    if (Number.isFinite(v)) setMonthlyRent(Math.min(v, 20000));
                  }}
                />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="cow-price">Purchase price</FieldLabel>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">$</span>
                <Input
                  id="cow-price"
                  inputMode="numeric"
                  className="pl-7 text-base font-semibold bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  value={purchasePrice.toLocaleString("en-US")}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(/[^0-9]/g, ""));
                    if (Number.isFinite(v)) setPurchasePrice(Math.min(v, 5_000_000));
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <FieldLabel>Down payment</FieldLabel>
              <div className="inline-flex rounded-full border border-white/20 p-0.5">
                {(["percent", "dollar"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDownMode(m)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      downMode === m
                        ? "bg-white text-[oklch(0.27_0.05_162)]"
                        : "text-white/60 hover:text-white"
                    }`}
                    aria-pressed={downMode === m}
                  >
                    {m === "percent" ? "%" : "$"}
                  </button>
                ))}
              </div>
            </div>
            {downMode === "percent" ? (
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-display font-semibold text-2xl text-white">
                    {downPct.toFixed(downPct % 1 === 0 ? 0 : 1)}%
                  </span>
                  <span className="text-sm text-white/60">{fmtUsd(downDollars)}</span>
                </div>
                <Slider
                  className="mt-3 cow-slider"
                  value={[downPct]}
                  min={0}
                  max={20}
                  step={0.5}
                  onValueChange={([v]) => setDownPct(v)}
                  aria-label="Down payment percentage"
                />
                <div className="mt-1.5 flex justify-between text-[0.7rem] text-white/50">
                  <span>0% (zero down)</span>
                  <span>20%</span>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">$</span>
                  <Input
                    inputMode="numeric"
                    className="pl-7 text-base font-semibold bg-white/10 border-white/20 text-white"
                    value={downDollars.toLocaleString("en-US")}
                    onChange={(e) => handleDollarInput(e.target.value)}
                    aria-label="Down payment dollars"
                  />
                </div>
                <p className="mt-1.5 text-sm text-white/60">
                  = {((downDollars / Math.max(purchasePrice, 1)) * 100).toFixed(1)}% of purchase price
                </p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <FieldLabel>Interest rate</FieldLabel>
              <span className="font-display font-semibold text-2xl text-white">
                {interestRate.toFixed(3).replace(/\.?0+$/, "")}%
              </span>
            </div>
            <Slider
              className="mt-3 cow-slider"
              value={[interestRate]}
              min={5.875}
              max={6.5}
              step={0.125}
              onValueChange={([v]) => setInterestRate(v)}
              aria-label="Interest rate"
            />
            <div className="mt-1.5 flex justify-between text-[0.7rem] text-white/50">
              <span>5.875%</span>
              <span>6.5%</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="inline-flex items-center gap-1.5">
                <FieldLabel>Home appreciation /yr</FieldLabel>
                <AppreciationHistoryInfo />
              </span>
              <span className="font-display font-semibold text-2xl text-white">
                {appreciation.toFixed(appreciation % 1 === 0 ? 0 : 1)}%
              </span>
            </div>
            <Slider
              className="mt-3 cow-slider"
              value={[appreciation]}
              min={0}
              max={3}
              step={0.5}
              onValueChange={([v]) => setAppreciation(v)}
              aria-label="Annual home price appreciation"
            />
            <div className="mt-1.5 flex justify-between text-[0.7rem] text-white/50">
              <span>0%</span>
              <span>3%</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="inline-flex items-center gap-1.5">
                <FieldLabel>Rent increase /yr</FieldLabel>
                <RentHistoryInfo />
              </span>
              <span className="font-display font-semibold text-2xl text-white">
                {rentIncrease.toFixed(rentIncrease % 1 === 0 ? 0 : 1)}%
              </span>
            </div>
            <Slider
              className="mt-3 cow-slider"
              value={[rentIncrease]}
              min={0}
              max={10}
              step={0.5}
              onValueChange={([v]) => setRentIncrease(v)}
              aria-label="Annual rent increase"
            />
            <div className="mt-1.5 flex justify-between text-[0.7rem] text-white/50">
              <span>0% (flat rent)</span>
              <span>10%</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div>
          <div className="rounded-lg bg-white/[0.04] border border-white/10 p-5 md:p-6">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h4 className="font-display font-semibold text-lg text-white">
                Rent spent vs. equity built, year by year
              </h4>
              <span className="text-xs text-white/50">
                P&amp;I {fmtUsd(result.monthlyPayment)}/mo on {fmtUsd(result.loanAmount)} loan
              </span>
            </div>
            <div className="mt-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(1 0 0 / 0.1)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "oklch(1 0 0 / 0.6)" }}
                  />
                  <YAxis hide domain={[0, (dataMax: number) => dataMax * 1.18]} />
                  <Legend
                    formatter={(value: string) => (
                      <span style={{ color: "oklch(1 0 0 / 0.7)", fontSize: 12 }}>
                        {value === "rent" ? "Rent paid (money gone)" : "Equity built (wealth kept)"}
                      </span>
                    )}
                  />
                  <Bar dataKey="rent" fill={COLORS.rent} radius={[5, 5, 0, 0]} maxBarSize={52}>
                    <LabelList
                      dataKey="rent"
                      position="top"
                      formatter={(v: number) => fmtUsdShort(v)}
                      style={{ fontSize: 11, fontWeight: 700, fill: "oklch(0.8 0.1 25)" }}
                    />
                  </Bar>
                  <Bar dataKey="equity" fill={COLORS.equity} radius={[5, 5, 0, 0]} maxBarSize={52}>
                    <LabelList
                      dataKey="equity"
                      position="top"
                      formatter={(v: number) => fmtUsdShort(v)}
                      style={{ fontSize: 11, fontWeight: 700, fill: "oklch(0.85 0.11 80)" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-5 grid sm:grid-cols-3 gap-4">
            <div className="rounded-md bg-white/[0.05] border border-white/10 p-4">
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/55">
                Rent paid in {waitYears} {waitYears === 1 ? "yr" : "yrs"}
              </div>
              <div className="mt-1 font-display font-semibold text-2xl" style={{ color: "oklch(0.8 0.1 25)" }}>
                {fmtUsd(result.totalRentPaid)}
              </div>
              <div className="text-xs text-white/55">builds zero equity for you</div>
            </div>
            <div className="rounded-md bg-white/[0.05] border border-white/10 p-4">
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/55">
                Equity if you buy now
              </div>
              <div className="mt-1 font-display font-semibold text-2xl" style={{ color: "oklch(0.85 0.11 80)" }}>
                {fmtUsd(Math.max(result.equityGained, 0))}
              </div>
              <div className="text-xs text-white/55">principal paydown + appreciation</div>
            </div>
            <div className="rounded-md border p-4" style={{ background: "oklch(0.73 0.13 75 / 0.15)", borderColor: "oklch(0.73 0.13 75 / 0.4)" }}>
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/70">
                Cost of waiting
              </div>
              <div className="mt-1 font-display font-semibold text-2xl text-white">
                {fmtUsd(Math.max(result.costOfWaiting, 0))}
              </div>
              <div className="text-xs text-white/70">rent spent + equity missed</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-white/50 leading-relaxed max-w-md">
              Educational estimate only: principal &amp; interest on a 30-year fixed loan; excludes taxes,
              insurance, maintenance, and closing costs. Rent is assumed to rise at your selected
              annual rate. Not a loan offer or rate quote.
            </p>
            <div className="flex flex-col gap-2.5 sm:items-end">
              <button
                type="button"
                onClick={attachAndGoToForm}
                className="btn-press inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-md hover:brightness-105 whitespace-nowrap"
              >
                Get these numbers in my Roadmap <FileDown className="h-4 w-4" />
              </button>
              <a
                href="#book-call"
                className="btn-press inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm whitespace-nowrap"
              >
                Run my numbers <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
