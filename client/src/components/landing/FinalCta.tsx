/* GOLDEN HOUR PORCH — final CTA band: book a call or start application */
import { useReveal } from "@/hooks/useReveal";
import { CALENDLY_BOOKING_URL } from "@/lib/booking";
import { EXPERIENCE_REVIEWS_URL } from "@/lib/reviews";
import { CalendarClock, ExternalLink, FileText, MessageSquare, PhoneCall } from "lucide-react";

const COUPLE_IMG = "/manus-storage/couple-keys-porch_77fc9abd.png";

export default function FinalCta() {
  const ref = useReveal<HTMLElement>();
  return (
    <section id="book-call" ref={ref} className="relative py-20 md:py-28 overflow-hidden text-primary-foreground" style={{ background: "oklch(0.27 0.05 162)" }}>
      <div className="container grid lg:grid-cols-[7fr_5fr] gap-12 items-center">
        <div>
          <span className="key-tag bg-white/10" style={{ color: "oklch(0.82 0.12 80)" }}>
            Two easy ways to start
          </span>
          <h2 className="mt-5 font-sans font-semibold tracking-[-0.03em] text-3xl md:text-5xl leading-[1.08] reveal">
            Your first home is closer than you think.
          </h2>
          <p className="mt-5 text-lg text-white/75 leading-relaxed max-w-xl reveal">
            Whether you want to talk it through first or jump straight in, the next step takes less than
            15 minutes — and costs nothing.
          </p>
          <div className="mt-9 grid sm:grid-cols-2 gap-4 reveal">
            <div className="rounded-lg bg-accent p-6 text-accent-foreground shadow-lg">
              <CalendarClock className="phone-icon h-7 w-7" />
              <div className="mt-3 font-display font-semibold text-xl">Option A — Let's chat first</div>
              <p className="mt-1.5 text-sm leading-relaxed opacity-80">
                Choose the way you prefer to reach Mike for a free 15-minute strategy call — no pressure, no obligation.
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <a href={CALENDLY_BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-press inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110">
                  <CalendarClock className="h-4 w-4" /> Schedule a call
                </a>
                <a href="tel:+15417290819" className="btn-press phone-link inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110">
                  <PhoneCall className="phone-icon h-4 w-4" /> Call Mike
                </a>
                <a href="sms:+15417290819?&body=Hi%20Mike%2C%20I%27d%20like%20to%20talk%20through%20my%20homebuying%20options." className="btn-press inline-flex items-center gap-2 rounded-md border border-primary/20 bg-white/40 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-white/60">
                  <MessageSquare className="h-4 w-4" /> Text Mike
                </a>
              </div>
              <a
                href={EXPERIENCE_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline underline-offset-4 transition hover:text-primary/80"
              >
                Read Mike’s verified client reviews <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
            <a
              href="https://portal.myhometrac.com/borrower/signup/mford@cfmtg.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press group rounded-lg border border-white/20 bg-white/[0.06] p-6 backdrop-blur-sm hover:bg-white/10"
            >
              <FileText className="h-7 w-7" style={{ color: "oklch(0.82 0.12 80)" }} />
              <div className="mt-3 font-display font-semibold text-xl">Option B — Jump right in</div>
              <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                Ready now? Apply online through Cornerstone's secure portal and see what you qualify for today.
              </p>
            </a>
          </div>
          <p className="mt-5 text-xs text-white/50 reveal">
            Prefer email? Reach Mike anytime at mford@cfmtg.com.
          </p>
        </div>
        <div className="relative reveal hidden lg:block">
          <div className="rounded-lg overflow-hidden shadow-2xl rotate-[2deg]">
            <img src={COUPLE_IMG} alt="A couple celebrating with their new house key at golden hour" className="w-full h-[440px] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
