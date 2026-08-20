/* GOLDEN HOUR PORCH — 2-1 temporary buydown calculator: editorial, interactive, seller-subsidy story */
import { useEffect, useMemo, useState } from "react";
import { useReveal } from "@/hooks/useReveal";
import { useScenario } from "@/contexts/ScenarioContext";
import { computeBuydown } from "@shared/buydown";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, FileDown, Share2 } from "lucide-react";
import { toast } from "sonner";

const fmtUsd = (v: number, digits = 0) =>
  v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

type BuydownProps = {
  purchasePrice?: number;
  propertyAddress?: string;
  monthlyPropertyTaxes?: number;
  monthlyHoaDues?: number;
  monthlyHomeownerInsurance?: number;
  monthlyMortgageInsurance?: number;
  maxSellerContribution?: number;
};

export default function Buydown({ purchasePrice: prefilledPurchasePrice = 450000, propertyAddress, monthlyPropertyTaxes = 0, monthlyHoaDues = 0, monthlyHomeownerInsurance = 0, monthlyMortgageInsurance = 0, maxSellerContribution }: BuydownProps) {
  const ref = useReveal<HTMLElement>();
  const { setScenario, setAttached } = useScenario();

  const [purchasePrice, setPurchasePrice] = useState(prefilledPurchasePrice);
  const [downPct, setDownPct] = useState(5); // slider drives percentage
  const [downMode, setDownMode] = useState<"percent" | "dollar">("percent");
  const [noteRate, setNoteRate] = useState(6.5);
  const [rateText, setRateText] = useState("6.5"); // raw input text so "5." / "5.8" survive typing

  const downDollars = useMemo(
    () => Math.round((purchasePrice * downPct) / 100),
    [purchasePrice, downPct]
  );

  const result = useMemo(
    () =>
      computeBuydown({
        purchasePrice,
        downPayment: downDollars,
        noteRate,
    }),
    [purchasePrice, downDollars, noteRate]
  );
  const savedMonthlyPropertyCosts = Math.max(monthlyPropertyTaxes, 0) + Math.max(monthlyHoaDues, 0) + Math.max(monthlyHomeownerInsurance, 0) + Math.max(monthlyMortgageInsurance, 0);
  const savedCostLabels = [monthlyPropertyTaxes > 0 ? `${fmtUsd(monthlyPropertyTaxes)}/mo taxes` : null, monthlyHoaDues > 0 ? `${fmtUsd(monthlyHoaDues)}/mo HOA` : null, monthlyHomeownerInsurance > 0 ? `${fmtUsd(monthlyHomeownerInsurance)}/mo homeowner insurance` : null, monthlyMortgageInsurance > 0 ? `${fmtUsd(monthlyMortgageInsurance)}/mo mortgage insurance` : null].filter(Boolean).join(", ");
  const sellerContributionNeedsReview = Boolean(maxSellerContribution && maxSellerContribution > 0 && result.totalSubsidy > maxSellerContribution);

  // Keep the shared scenario in sync with the latest calculator run so the
  // Roadmap form can attach it when the visitor opts in.
  useEffect(() => {
    setScenario({
      purchasePrice,
      downPayment: downDollars,
      noteRate,
      loanAmount: result.loanAmount,
      year1Payment: Math.round(result.year1Payment),
      year2Payment: Math.round(result.year2Payment),
      notePayment: Math.round(result.notePayment),
      year1MonthlySavings: Math.round(result.year1MonthlySavings),
      year2MonthlySavings: Math.round(result.year2MonthlySavings),
      totalSubsidy: Math.round(result.totalSubsidy),
    });
  }, [purchasePrice, downDollars, noteRate, result, setScenario]);

  const attachAndGoToForm = () => {
    setAttached(true);
    document.getElementById("roadmap")?.scrollIntoView({ behavior: "smooth" });
  };

  const shareScenario = async () => {
    const heading = propertyAddress ? `2-1 Buydown scenario for ${propertyAddress}` : "2-1 Buydown scenario";
    const savedCosts = savedMonthlyPropertyCosts > 0 ? ` Saved property planning costs to review: ${savedCostLabels}.` : "";
    const summary = `${heading}: ${fmtUsd(purchasePrice)} purchase price with ${fmtUsd(downDollars)} down and a ${noteRate.toFixed(3).replace(/\.?0+$/, "")}% note rate. Estimated monthly principal-and-interest savings: ${fmtUsd(result.year1MonthlySavings)} in year one and ${fmtUsd(result.year2MonthlySavings)} in year two. Estimated seller-paid interest subsidy: ${fmtUsd(result.totalSubsidy)}.${savedCosts}`;
    const url = `${window.location.href.split("#")[0]}#buydown`;
    try {
      if (navigator.share) {
        await navigator.share({ title: heading, text: summary, url });
        return;
      }
      await navigator.clipboard.writeText(`${summary}\n${url}`);
      toast.success("2-1 Buydown scenario copied for sharing.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Unable to share this scenario. Please try again.");
    }
  };

  const handleDollarInput = (raw: string) => {
    const v = Number(raw.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(v)) return;
    const clamped = Math.min(Math.max(v, 0), purchasePrice);
    setDownPct(purchasePrice > 0 ? (clamped / purchasePrice) * 100 : 0);
  };

  return (
    <section ref={ref} className="py-20 md:py-28 bg-card/60 border-y border-foreground/10">
      <div className="container">
        <div className="max-w-2xl reveal">
          <span className="key-tag bg-secondary text-secondary-foreground">Affordability play</span>
          <h2 className="mt-5 font-display font-semibold text-3xl md:text-[2.75rem] leading-[1.12] text-foreground">
            The 2-1 buydown: <span className="amber-underline">ease into your payment.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            A seller-paid 2-1 temporary buydown can be a potential short-run affordability option. It may lower
            the rate by <strong className="text-foreground">2% in year one</strong> and{" "}
            <strong className="text-foreground">1% in year two</strong>. Use the inputs below to explore potential monthly savings.
          </p>
        </div>

        <div className="mt-12 grid lg:grid-cols-[minmax(300px,380px)_1fr] gap-8 lg:gap-12 items-start">
          {/* Inputs */}
          <div className="reveal rounded-lg bg-background border border-foreground/12 shadow-sm p-6 md:p-7 space-y-6">
            <div>
              <label htmlFor="bd-price" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Purchase price
              </label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="bd-price"
                  inputMode="numeric"
                  className="pl-7 text-base font-semibold"
                  value={purchasePrice.toLocaleString("en-US")}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(/[^0-9]/g, ""));
                    if (Number.isFinite(v)) setPurchasePrice(Math.min(v, 5_000_000));
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Down payment
                </label>
                <div className="inline-flex rounded-full border border-foreground/15 p-0.5">
                  {(["percent", "dollar"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDownMode(m)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        downMode === m
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
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
                    <span className="font-display font-semibold text-3xl text-foreground">
                      {downPct.toFixed(downPct % 1 === 0 ? 0 : 1)}%
                    </span>
                    <span className="text-sm text-muted-foreground">{fmtUsd(downDollars)}</span>
                  </div>
                  <Slider
                    className="mt-3"
                    value={[downPct]}
                    min={0}
                    max={30}
                    step={0.5}
                    onValueChange={([v]) => setDownPct(v)}
                    aria-label="Down payment percentage"
                  />
                  <div className="mt-1.5 flex justify-between text-[0.7rem] text-muted-foreground">
                    <span>0%</span>
                    <span>30%</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      inputMode="numeric"
                      className="pl-7 text-base font-semibold"
                      value={downDollars.toLocaleString("en-US")}
                      onChange={(e) => handleDollarInput(e.target.value)}
                      aria-label="Down payment dollars"
                    />
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    = {((downDollars / Math.max(purchasePrice, 1)) * 100).toFixed(1)}% of purchase price
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="bd-rate" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Note rate (%)
              </label>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  id="bd-rate"
                  inputMode="decimal"
                  className="w-28 text-base font-semibold"
                  value={rateText}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (!/^\d*\.?\d*$/.test(raw)) return; // digits + one decimal point only
                    setRateText(raw);
                    const v = Number(raw);
                    if (raw !== "" && Number.isFinite(v) && v >= 0 && v <= 15) setNoteRate(v);
                  }}
                  onBlur={() => setRateText(String(noteRate))}
                />
                <div className="flex gap-1.5">
                  {[5.875, 6.5].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setNoteRate(r);
                        setRateText(String(r));
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        noteRate === r
                          ? "bg-primary text-primary-foreground border-primary"
                          : "text-muted-foreground border-foreground/15 hover:text-foreground"
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Year 1 rate: <strong className="text-foreground">{result.year1Rate.toFixed(3).replace(/\.?0+$/, "")}%</strong> · Year 2
                rate: <strong className="text-foreground">{result.year2Rate.toFixed(3).replace(/\.?0+$/, "")}%</strong>
              </p>
            </div>

            <div className="rounded-md bg-secondary p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Loan amount
              </div>
              <div className="mt-1 font-display font-semibold text-2xl text-foreground">
                {fmtUsd(result.loanAmount)}
              </div>
            </div>
          </div>

          {/* Results: chart + savings ledger */}
          <div className="reveal" style={{ transitionDelay: "80ms" }}>
            <div className="rounded-lg bg-background border border-foreground/12 shadow-sm p-5 md:p-7">
              <h3 className="font-display font-semibold text-xl text-foreground">
                Potential monthly payment savings
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">This educational comparison shows potential monthly principal-and-interest savings from a fully seller-funded 2-1 interest subsidy. It does not quote a payment, APR, loan fees, closing costs, or loan terms.</p>
              <div className="mt-6 grid sm:grid-cols-3 gap-4 border-t border-foreground/10 pt-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Year 1 savings
                  </div>
                  <div className="mt-1 font-display font-semibold text-2xl text-amber-700">
                    {fmtUsd(result.year1MonthlySavings)}/mo
                  </div>
                  <div className="text-sm text-muted-foreground">{fmtUsd(result.year1AnnualSavings)} for the year</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Year 2 savings
                  </div>
                  <div className="mt-1 font-display font-semibold text-2xl text-amber-700">
                    {fmtUsd(result.year2MonthlySavings)}/mo
                  </div>
                  <div className="text-sm text-muted-foreground">{fmtUsd(result.year2AnnualSavings)} for the year</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Seller-paid subsidy
                  </div>
                  <div className="mt-1 font-display font-semibold text-2xl text-primary">
                    {fmtUsd(result.totalSubsidy)}
                  </div>
                  <div className="text-sm text-muted-foreground">total cost covered by the seller</div>
                </div>
              </div>
              {savedMonthlyPropertyCosts > 0 ? <div className="mt-5 rounded-md border border-primary/15 bg-primary/[0.05] p-4 text-sm text-muted-foreground"><p className="font-semibold text-foreground">Saved property costs to discuss</p><p className="mt-1 leading-relaxed">{savedCostLabels}. Your loan officer can prepare a complete, loan-specific payment and APR disclosure after reviewing the full application, loan terms, fees, and program eligibility.</p></div> : null}
              {sellerContributionNeedsReview ? <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">Seller-contribution review needed</p><p className="mt-1 leading-relaxed">This savings illustration exceeds the saved seller-contribution planning limit for this property. Please discuss alternate structures and current program, contract, and closing-cost requirements with your loan officer.</p></div> : null}
            </div>

            <div className="mt-6 rounded-lg bg-secondary p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <p className="flex-1 text-sm md:text-base text-secondary-foreground leading-relaxed">
                <strong className="font-semibold text-foreground">How it works:</strong> the seller-funded interest subsidy is generally paid through the closing process and may reduce the rate for the first two years. This example assumes the purchase contract includes sufficient negotiated seller contributions toward the 2-1 buydown subsidy, buyer closing costs, and prepaids as applicable. Contribution limits, underwriting, and program rules apply.
              </p>
              <div className="flex flex-col gap-2.5">
                {propertyAddress ? <button
                  type="button"
                  onClick={shareScenario}
                  className="btn-press inline-flex items-center justify-center gap-2 rounded-md border border-primary/25 bg-card px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/5 whitespace-nowrap"
                >
                  Share this scenario <Share2 className="h-4 w-4" />
                </button> : null}
                <button
                  type="button"
                  onClick={attachAndGoToForm}
                  className="btn-press inline-flex items-center justify-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-sm whitespace-nowrap"
                >
                  Get these numbers in my Roadmap
                  <FileDown className="h-4 w-4" />
                </button>
                <a
                  href="#book-call"
                  className="btn-press inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm whitespace-nowrap"
                >
                  Run my numbers
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              Educational savings illustration only—not a payment quote, APR quote, loan estimate, commitment to lend, or offer of credit. Actual financing depends on the complete application, credit, income, assets, property, program availability, loan fees, discount points, seller concessions, closing costs, prepaid items, mortgage insurance, and underwriting approval. You must qualify at the full note rate.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
