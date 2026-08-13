/* GOLDEN HOUR PORCH — 3-step path with connecting line (Call → Pre-approval → Keys) */
import { useReveal } from "@/hooks/useReveal";
import { PhoneCall, FileCheck2, Home } from "lucide-react";

const steps = [
  {
    icon: PhoneCall,
    num: "01",
    title: "A 15-minute strategy call",
    body: "We look at your income, goals, and timeline, then run your real numbers across the programs you qualify for. No pressure, no obligation — just clarity.",
  },
  {
    icon: FileCheck2,
    num: "02",
    title: "Pre-approval, together",
    body: "We review your credit side-by-side, fix quick red flags, and get your pre-approval letter — the document agents and sellers require before they take you seriously.",
  },
  {
    icon: Home,
    num: "03",
    title: "Shop with confidence",
    body: "You'll know your exact max price and monthly payment before you fall in love with a house. Then we close, and the keys are yours.",
  },
];

export default function HowItWorks() {
  const ref = useReveal<HTMLElement>();
  return (
    <section id="how-it-works" ref={ref} className="py-20 md:py-28">
      <div className="container">
        <div className="max-w-2xl reveal">
          <span className="key-tag bg-secondary text-secondary-foreground">The path</span>
          <h2 className="mt-5 font-display font-semibold text-3xl md:text-[2.75rem] leading-[1.12] text-foreground">
            From renting to keys, in three honest steps.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Pre-approval isn't the last thing you do — it's the very first, before you even browse listings.
            Here's how we make it stress-free.
          </p>
        </div>
        <div className="mt-14 relative grid md:grid-cols-3 gap-10 md:gap-8">
          {/* connecting line */}
          <div
            aria-hidden
            className="hidden md:block absolute top-7 left-[16%] right-[16%] h-px"
            style={{ background: "repeating-linear-gradient(90deg, oklch(0.73 0.13 75) 0 8px, transparent 8px 16px)" }}
          />
          {steps.map((s, i) => (
            <div key={s.num} className="reveal relative" style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                <s.icon className="h-6 w-6" />
              </div>
              <div className="mt-5 font-display font-semibold text-sm tracking-[0.2em] text-accent-foreground/60" style={{ color: "oklch(0.55 0.11 75)" }}>
                STEP {s.num}
              </div>
              <h3 className="mt-2 font-display font-semibold text-2xl text-foreground">{s.title}</h3>
              <p className="mt-3 text-base text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
