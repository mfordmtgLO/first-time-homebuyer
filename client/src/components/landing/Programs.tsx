/* GOLDEN HOUR PORCH — editorial program ledger: hairline rules, oversized serif pull-numbers, no card grid */
import { useReveal } from "@/hooks/useReveal";
import { ArrowRight } from "lucide-react";

const programs = [
  {
    down: "0%",
    name: "USDA Loans",
    who: "Suburban & rural buyers",
    body: "Perfect if you're looking at homes in suburban or rural areas. Great rates for moderate-income buyers — and no down payment required.",
  },
  {
    down: "0%",
    name: "VA Loans",
    who: "Military, veterans & surviving spouses",
    body: "The strongest option on the market, reserved exclusively for those who've served. No down payment and no monthly mortgage insurance.",
  },
  {
    down: "0%",
    name: "Conventional Zero-Down",
    who: "Strong-credit buyers",
    body: "Ideal for buyers with solid credit scores who want to keep their savings intact and maximize flexibility.",
  },
  {
    down: "3.5%",
    name: "FHA Loans",
    who: "Flexible credit situations",
    body: "Highly flexible on credit scores, and your down payment can be a gift from family. A forgiving path to your first keys.",
  },
];

export default function Programs() {
  const ref = useReveal<HTMLElement>();
  return (
    <section id="programs" ref={ref} className="py-20 md:py-28">
      <div className="container">
        <div className="max-w-2xl reveal">
          <span className="key-tag bg-secondary text-secondary-foreground">Your options</span>
          <h2 className="mt-5 font-display font-semibold text-3xl md:text-[2.75rem] leading-[1.12] text-foreground">
            Four proven paths to keys in hand — <span className="amber-underline">most with $0 down.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            There's no one-size-fits-all mortgage. The program that's perfect for your coworker might be the
            wrong financial move for you. Here's the honest lay of the land.
          </p>
        </div>
        {/* Editorial ledger rows: hairline rules instead of boxed cards */}
        <div className="mt-14 border-t border-foreground/15">
          {programs.map((p, i) => (
            <div
              key={p.name}
              className="reveal group grid md:grid-cols-[minmax(120px,180px)_1fr_2fr] gap-4 md:gap-10 items-start py-8 md:py-10 border-b border-foreground/15 hover:bg-card/60 transition-colors duration-300 md:px-4 md:-mx-4"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="font-display font-semibold text-6xl md:text-7xl leading-none text-primary/90">
                {p.down}
                <span className="block text-[0.65rem] font-sans font-semibold uppercase tracking-[0.22em] text-muted-foreground mt-2">
                  down payment
                </span>
              </div>
              <div>
                <h3 className="font-display font-semibold text-2xl md:text-[1.65rem] text-foreground leading-tight">{p.name}</h3>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "oklch(0.55 0.11 75)" }}>
                  {p.who}
                </div>
              </div>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed md:pt-1">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 reveal flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-lg bg-secondary p-6 md:p-7">
          <p className="text-base text-secondary-foreground leading-relaxed flex-1">
            <strong className="font-semibold text-foreground">Not sure which fits?</strong> That's normal — the
            internet gives generic advice, but your finances are unique. We'll compare programs side-by-side and
            show you exact monthly payments, upfront costs, and long-term savings.
          </p>
          <a
            href="#book-call"
            className="btn-press inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm whitespace-nowrap"
          >
            Find your best program
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
