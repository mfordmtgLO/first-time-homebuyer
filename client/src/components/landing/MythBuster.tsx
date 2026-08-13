/* GOLDEN HOUR PORCH — evergreen band: the 20% myth vs. the cost of waiting */
import { useReveal } from "@/hooks/useReveal";
import { TrendingUp, Hourglass, KeyRound } from "lucide-react";
import CostOfWaiting from "./CostOfWaiting";

export default function MythBuster() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="relative py-20 md:py-28 text-primary-foreground" style={{ background: "oklch(0.27 0.05 162)" }}>
      <div className="container">
      <div className="grid lg:grid-cols-[5fr_7fr] gap-12 items-start">
        <div className="lg:sticky lg:top-28 reveal">
          <span className="key-tag bg-white/10 text-amber-honey" style={{ color: "oklch(0.82 0.12 80)" }}>
            The myth we need to bust
          </span>
          <h2 className="mt-5 font-display font-semibold text-3xl md:text-[2.75rem] leading-[1.12]">
            Waiting to save 20% is quietly costing you tens of thousands.
          </h2>
          <p className="mt-5 text-base md:text-lg leading-relaxed text-white/75 max-w-md">
            Most renters believe they need $40,000–$50,000 saved before they can even start looking.
            Meanwhile, rent keeps climbing and home prices keep rising. The math rarely favors waiting.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {[
            {
              icon: Hourglass,
              stat: "5+ yrs",
              label: "Average time renters spend saving for a 20% down payment they may never need",
            },
            {
              icon: TrendingUp,
              stat: "$21k+",
              label: "Typical rent paid over just 12 months that builds zero equity for you",
            },
            {
              icon: KeyRound,
              stat: "0–3.5%",
              label: "Actual down payment range for USDA, VA, zero-down conventional, and FHA programs",
            },
          ].map((item, i) => (
            <div
              key={item.stat}
              className={`reveal rounded-lg bg-white/[0.06] border border-white/10 p-7 backdrop-blur-sm ${i === 2 ? "sm:col-span-2" : ""}`}
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <item.icon className="h-6 w-6" style={{ color: "oklch(0.82 0.12 80)" }} />
              <div className="mt-4 font-display font-semibold text-4xl md:text-5xl leading-none">{item.stat}</div>
              <p className="mt-3 text-sm md:text-base text-white/70 leading-relaxed">{item.label}</p>
            </div>
          ))}
          <div className="reveal sm:col-span-2 rounded-lg border border-white/10 p-7" style={{ transitionDelay: "220ms", background: "oklch(0.73 0.13 75 / 0.12)" }}>
            <p className="text-base md:text-lg leading-relaxed text-white/85">
              <strong className="font-semibold text-white">The truth:</strong> buying now with a low- or
              zero-down program often costs significantly less than waiting years while rent and prices rise.
              The right program depends on your income, location, and credit — and that's exactly what we
              figure out together in 15 minutes.
            </p>
          </div>
        </div>
        </div>
        <CostOfWaiting />
      </div>
    </section>
  );
}
