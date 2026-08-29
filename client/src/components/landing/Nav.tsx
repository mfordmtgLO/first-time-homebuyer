/* GOLDEN HOUR PORCH — sticky nav: transparent over hero, opaque cream on scroll. Branding: Cornerstone First Mortgage (Mike Ford, NMLS# 288455) */
import { useEffect, useState } from "react";
import { CALENDLY_BOOKING_URL } from "@/lib/booking";
import { Phone } from "lucide-react";

const LOGO = "/manus-storage/cornerstone-logo-standard_72b02c9f.png";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-cream/92 backdrop-blur-md shadow-[0_1px_0_oklch(0.88_0.02_85),0_8px_24px_-16px_rgb(0_0_0/0.25)]"
          : "bg-transparent"
      }`}
      style={scrolled ? { backgroundColor: "oklch(0.975 0.012 85 / 0.92)" } : undefined}
    >
      <div className="container flex items-center justify-between h-16 md:h-[72px]">
        <a href="#top" className="flex items-center gap-2.5">
          <img
            src={LOGO}
            alt="Cornerstone First Mortgage logo"
            className="h-9 md:h-11 w-auto object-contain"
          />
        </a>
        <div className="flex items-center gap-3">
          <a
            href="tel:+15417290819"
            className="phone-link hidden md:flex items-center gap-2 text-sm font-semibold text-foreground/80 hover:text-foreground"
          >
            <Phone className="phone-icon h-4 w-4 text-accent" />
            (541) 729-0819
          </a>
          <a
            href="tel:+15417290819"
            aria-label="Call Mike Ford at (541) 729-0819"
            className="btn-press inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-primary/20 bg-card/80 text-primary shadow-sm md:hidden"
          >
            <Phone className="h-5 w-5" aria-hidden="true" />
          </a>
          <a
            href={CALENDLY_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-press inline-flex min-h-11 items-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:brightness-105"
          >
            Book a 15-min Call
          </a>
        </div>
      </div>
    </header>
  );
}
