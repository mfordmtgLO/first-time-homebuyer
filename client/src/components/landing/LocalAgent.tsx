/**
 * Local Real Estate Agent — public co-marketing section.
 * On the default homepage (/) it shows the "featured" agent chosen in the
 * /leads dashboard. On co-branded /with/:slug pages it shows that specific
 * agent. Renders nothing when no matching visible agent exists.
 */
import { trpc } from "@/lib/trpc";
import { useAgentSlug, useLoanOfficerSlug } from "@/contexts/AgentPageContext";
import { Globe, Mail, Phone } from "lucide-react";

export default function LocalAgent() {
  const slug = useAgentSlug();
  const loanOfficerSlug = useLoanOfficerSlug();
  const bySlug = trpc.agent.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug, staleTime: 5 * 60 * 1000, retry: 1 }
  );
  const featured = trpc.agent.getFeatured.useQuery(undefined, {
    enabled: !slug && !loanOfficerSlug,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const agent = slug ? bySlug.data : loanOfficerSlug ? null : featured.data;

  if (!agent || agent.visible !== 1 || !agent.name.trim()) return null;

  const websiteHref = agent.website
    ? agent.website.startsWith("http")
      ? agent.website
      : `https://${agent.website}`
    : "";
  const websiteLabel = websiteHref.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <section id="local-agent" className="bg-secondary/40 py-16 sm:py-20">
      <div className="container">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Your buying team
        </p>
        <h2 className="mt-2 font-display font-bold text-3xl sm:text-4xl text-foreground">
          Local Real Estate Agent
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Financing is only half the journey — a great local agent finds the home. We work
          side-by-side so your offer is strong and your closing is smooth.
        </p>

        <div className="mt-8 rounded-xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[auto_1fr]">
            <div className="flex items-center justify-center p-8 md:p-10 bg-muted/30 md:border-r border-border">
              {agent.headshotUrl ? (
                <img
                  src={agent.headshotUrl}
                  alt={`${agent.name}, real estate agent`}
                  className="h-40 w-40 rounded-full object-cover border-4 border-card shadow-md"
                />
              ) : (
                <div className="h-40 w-40 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-display font-bold text-4xl text-primary">
                    {agent.name
                      .split(/\s+/)
                      .map((w: string) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="p-8 md:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-display font-semibold text-2xl text-foreground">
                    {agent.name}
                  </h3>
                  {agent.companyName && (
                    <p className="mt-0.5 text-sm font-medium text-primary">{agent.companyName}</p>
                  )}
                </div>
                {agent.companyLogoUrl && (
                  <img
                    src={agent.companyLogoUrl}
                    alt={`${agent.companyName || "Agency"} logo`}
                    className="h-12 w-auto max-w-[160px] object-contain"
                  />
                )}
              </div>

              {agent.bio && (
                <p className="mt-4 text-foreground/85 leading-relaxed max-w-2xl">{agent.bio}</p>
              )}

              <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-sm">
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone.replace(/[^\d+]/g, "")}`}
                    className="phone-link inline-flex items-center gap-2 font-medium text-foreground"
                  >
                    <Phone className="phone-link-icon h-4 w-4 text-primary" />
                    <span className="phone-link-text">{agent.phone}</span>
                  </a>
                )}
                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className="inline-flex items-center gap-2 font-medium text-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="h-4 w-4 text-primary" /> {agent.email}
                  </a>
                )}
                {websiteHref && (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-medium text-foreground hover:text-primary transition-colors"
                  >
                    <Globe className="h-4 w-4 text-primary" /> {websiteLabel}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground max-w-3xl">
          The featured real estate agent is an independent professional, not an employee or agent
          of Cornerstone First Mortgage. You are free to work with any real estate agent of your
          choosing.
        </p>
      </div>
    </section>
  );
}
