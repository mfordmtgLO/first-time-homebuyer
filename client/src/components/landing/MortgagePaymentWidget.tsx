import { useMemo, useState } from "react";
import { Calculator, Info } from "lucide-react";
import { estimateMortgagePlanning } from "@shared/mortgageEstimator";
import { Input } from "@/components/ui/input";

const currency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export default function MortgagePaymentWidget() {
  const [purchasePrice, setPurchasePrice] = useState(450000);
  const [downPaymentPercent, setDownPaymentPercent] = useState(5);
  const [rateText, setRateText] = useState("6.5");
  const [termYears, setTermYears] = useState(30);

  const annualRate = Number.parseFloat(rateText);
  const safeRate = Number.isFinite(annualRate) ? Math.min(Math.max(annualRate, 0), 15) : 0;
  const estimate = useMemo(
    () =>
      estimateMortgagePlanning({
        purchasePrice,
        downPaymentPercent,
        annualRate: safeRate,
        termYears,
      }),
    [purchasePrice, downPaymentPercent, safeRate, termYears],
  );

  return (
    <section id="payment-estimate" className="md:hidden border-y border-primary/10 bg-secondary/35 py-10">
      <div className="container">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Calculator className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="key-tag bg-card text-secondary-foreground">Quick estimate</p>
            <h2 className="mt-3 font-display text-2xl font-semibold leading-tight text-foreground">What might your payment look like?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Adjust a few starting assumptions to see an educational principal-and-interest estimate.</p>
          </div>
        </div>

        <div className="mt-6 space-y-4 rounded-lg border border-primary/10 bg-card p-4 shadow-sm">
          <div>
            <label htmlFor="mobile-payment-price" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Purchase price</label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="mobile-payment-price"
                inputMode="numeric"
                value={purchasePrice.toLocaleString("en-US")}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^0-9]/g, "");
                  setPurchasePrice(Math.min(Math.max(Number(raw) || 0, 0), 5000000));
                }}
                className="min-h-12 pl-7 text-base font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="mobile-payment-down" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Down payment</label>
              <div className="relative mt-2">
                <Input
                  id="mobile-payment-down"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  inputMode="decimal"
                  value={downPaymentPercent}
                  onChange={(event) => setDownPaymentPercent(Math.min(Math.max(Number(event.target.value) || 0, 0), 100))}
                  className="min-h-12 pr-9 text-base font-semibold"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <label htmlFor="mobile-payment-rate" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Rate</label>
              <div className="relative mt-2">
                <Input
                  id="mobile-payment-rate"
                  inputMode="decimal"
                  value={rateText}
                  onChange={(event) => {
                    const raw = event.target.value;
                    if (/^\d*(\.\d*)?$/.test(raw)) setRateText(raw);
                  }}
                  onBlur={() => setRateText(safeRate.toString())}
                  className="min-h-12 pr-9 text-base font-semibold"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="mobile-payment-term" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Loan term</label>
            <select
              id="mobile-payment-term"
              value={termYears}
              onChange={(event) => setTermYears(Number(event.target.value))}
              className="mt-2 min-h-12 w-full rounded-md border border-input bg-card px-3 text-base font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/60"
            >
              <option value={30}>30 years</option>
              <option value={20}>20 years</option>
              <option value={15}>15 years</option>
            </select>
          </div>

          <div className="border-t border-border/70 pt-4" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Estimated monthly principal &amp; interest</p>
            <p className="mt-1 font-display text-4xl font-semibold text-primary">{currency(estimate.monthlyPayment)}<span className="ml-1 text-base font-sans font-medium text-muted-foreground">/mo</span></p>
            <p className="mt-2 text-sm text-muted-foreground">Estimated loan amount: {currency(estimate.loanAmount)}</p>
          </div>

          <div className="flex items-start gap-2 border-t border-border/70 pt-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p>This is an educational estimate, not a loan offer, rate quote, APR, or promise of approval. Taxes, insurance, HOA dues, mortgage insurance, loan fees, and closing costs are not included.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
