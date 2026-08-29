import { Calculator, Home, Map, Phone } from "lucide-react";

const items = [
  { id: "top", label: "Home", icon: Home },
  { id: "payment-estimate", label: "Estimate", icon: Calculator },
  { id: "roadmap", label: "Roadmap", icon: Map },
  { id: "contact", label: "Contact", icon: Phone },
] as const;

export default function MobileBottomNav() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/15 bg-cream/95 px-2 pt-2 shadow-[0_-10px_28px_-20px_rgb(32_38_27/0.75)] backdrop-blur-md md:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollTo(id)}
            className="btn-press inline-flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[0.68rem] font-semibold text-primary/80 transition-colors hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
