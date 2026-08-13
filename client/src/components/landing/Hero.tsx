/* GOLDEN HOUR PORCH — asymmetric editorial hero: dominant golden-hour photo, overlapping paper stat card, arch motif */
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const HERO_IMG = "/manus-storage/hero-golden-hour-home_934ee356.png";
const COUPLE_IMG = "/manus-storage/couple-keys-porch_77fc9abd.png";

export default function Hero() {
  const ref = useReveal<HTMLElement>();
  return (
    <section id="top" ref={ref} className="relative overflow-hidden pt-28 md:pt-36 pb-16 md:pb-24">
      {/* warm radial glow */}
      <div
        aria-hidden
        className="absolute -top-40 -right-40 h-[540px] w-[540px] rounded-full opacity-40"
        style={{ background: "radial-gradient(circle, oklch(0.73 0.13 75 / 0.35), transparent 65%)" }}
      />
      <div className="container grid lg:grid-cols-[7fr_5fr] gap-12 lg:gap-8 items-center">
        <div className="max-w-2xl">
          <span className="key-tag bg-secondary text-secondary-foreground reveal in-view">
            For first-time homebuyers
          </span>
          <h1 className="mt-5 font-display font-semibold text-[2.5rem] leading-[1.08] md:text-6xl md:leading-[1.05] text-foreground reveal in-view">
            You don't need 20% down.
            <br />
            You need <span className="amber-underline">the right plan.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl reveal in-view" style={{ transitionDelay: "80ms" }}>
            Qualified first-time buyers can purchase a home with as little as
            <strong className="text-foreground font-semibold"> 0% down</strong> through USDA, VA, and
            specialized conventional programs. Stop paying your landlord's mortgage — let's map out yours.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 reveal in-view" style={{ transitionDelay: "140ms" }}>
            <a
              href="#book-call"
              className="btn-press inline-flex items-center justify-center gap-2 rounded-md bg-accent px-6 py-3.5 text-base font-semibold text-accent-foreground shadow-md hover:brightness-105"
            >
              See what your numbers look like
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#roadmap"
              className="btn-press inline-flex items-center justify-center gap-2 rounded-md border-2 border-primary/25 bg-transparent px-6 py-3.5 text-base font-semibold text-primary hover:bg-primary/5"
            >
              Get the free Roadmap
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground reveal in-view" style={{ transitionDelay: "200ms" }}>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> Mike Ford · Loan Officer · NMLS# 288455
            </span>
            <span>15-minute calls, zero pressure</span>
            <span className="flex items-center gap-1.5">
              Equal Opportunity Lender
              <img
                src="/manus-storage/equal-housing-opportunity-logo_a0ad8f72.png"
                alt="Equal Housing Opportunity logo"
                className="h-5 w-auto object-contain"
              />
            </span>
          </div>
        </div>

        {/* Straight architectural photo card with aligned supporting details. */}
        <div className="relative reveal in-view" style={{ transitionDelay: "180ms" }}>
          <div className="relative overflow-hidden rounded-md border border-primary/10 bg-card shadow-2xl">
            <img
              src={HERO_IMG}
              alt="A craftsman home glowing at golden hour"
              className="aspect-[4/5] w-full object-cover md:aspect-[5/6]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
          </div>
          <div className="absolute -bottom-5 -left-2 border-t-4 bg-card px-6 py-5 shadow-xl md:-left-8" style={{ borderTopColor: "oklch(0.73 0.13 75)" }}>
            <div className="font-display font-semibold text-4xl md:text-5xl text-primary leading-none">0%</div>
            <div className="mt-1.5 text-sm font-medium text-muted-foreground">
              down payment possible
              <br />
              for qualified buyers
            </div>
          </div>
          <div className="hidden md:block absolute -top-5 -right-3 w-32 border border-border/60 bg-card p-2 pb-5 shadow-lg">
            <img src={COUPLE_IMG} alt="A couple celebrating their new key" className="w-full h-28 object-cover" />
            <div className="mt-1.5 text-center font-display italic text-[0.7rem] text-muted-foreground">day one</div>
          </div>
        </div>
      </div>
    </section>
  );
}
