import { useEffect, useState } from "react";
import { CalendarDays, ChevronUp, MessageCircle } from "lucide-react";
import { CALENDLY_BOOKING_URL } from "@/lib/booking";

export const publicSectionNavigationItems = [
  { id: "top", label: "Top", icon: ChevronUp },
  { id: "cost-of-waiting", label: "Cost of Waiting", icon: null },
  { id: "buydown", label: "2-1 Buydown", icon: null },
  { id: "programs", label: "Loan Programs", icon: null },
  { id: "roadmap", label: "Roadmap", icon: null },
  { id: "how-it-works", label: "How It Works", icon: null },
  { id: "about", label: "Your Guide", icon: null },
  { id: "faq", label: "FAQ", icon: null },
] as const;

function scrollToPublicSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function getActivePublicSectionId(
  scrollY: number,
  getSectionTop: (sectionId: string) => number | undefined,
): (typeof publicSectionNavigationItems)[number]["id"] {
  if (scrollY < 96) return "top";

  const scrollOffset = 156;
  return publicSectionNavigationItems
    .slice(1)
    .filter(({ id }) => (getSectionTop(id) ?? Number.POSITIVE_INFINITY) <= scrollOffset)
    .at(-1)?.id ?? "top";
}

export default function PublicSectionNav() {
  const [activeSectionId, setActiveSectionId] = useState<(typeof publicSectionNavigationItems)[number]["id"]>("top");

  useEffect(() => {
    const updateActiveSection = () => {
      setActiveSectionId(
        getActivePublicSectionId(
          window.scrollY,
          (sectionId) => document.getElementById(sectionId)?.getBoundingClientRect().top,
        ),
      );
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  return (
    <nav
      aria-label="Explore this page"
      className="fixed inset-x-0 top-16 z-40 px-3 md:top-[4.6rem] md:px-5"
    >
      <div className="mx-auto max-w-fit overflow-hidden rounded-full border border-primary/15 bg-cream/95 px-1.5 py-1.5 shadow-[0_14px_28px_-20px_rgb(32_38_27/0.55)] backdrop-blur-md">
        <div className="flex max-w-[calc(100vw-1.5rem)] items-center gap-0.5 overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {publicSectionNavigationItems.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault();
                setActiveSectionId(id);
                scrollToPublicSection(id);
              }}
              aria-current={activeSectionId === id ? "location" : undefined}
              className={`btn-press inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${id === "top" ? "order-0" : "order-2"} ${
                activeSectionId === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/75 hover:bg-primary/8 hover:text-primary"
              }`}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("open-mortgage-chat"))}
            className="btn-press inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Mortgage Chat
          </button>
          <a
            href={CALENDLY_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-press order-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hidden"
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Book a call
          </a>
        </div>
      </div>
    </nav>
  );
}
