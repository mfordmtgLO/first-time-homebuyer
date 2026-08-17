import { BarChart3, FileText, MessageCircle, UsersRound, MapPinned } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { roadmapCohort, type RoadmapCohort } from "@shared/campaignCohorts";

function campaignLabel(row: { utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null }) {
  if (!row.utmSource && !row.utmCampaign) return "Direct / untagged";
  return [row.utmSource, row.utmMedium, row.utmCampaign].filter(Boolean).join(" · ");
}

export default function CampaignFunnelSummary() {
  const roadmapQuery = trpc.leads.list.useQuery();
  const chatQuery = trpc.chat.list.useQuery();
  const roadmap = roadmapQuery.data ?? [];
  const chats = chatQuery.data ?? [];
  const qualifiedChats = chats.filter((lead) => lead.status === "qualified");
  const homesListRequests = chats.filter((lead) => lead.lowDownPaymentHomeSearch === 1);
  const buyerAgentRequests = chats.filter((lead) => lead.buyerAgentRequest === 1);

  const byCampaign = new Map<string, { roadmap: number; completedChats: number; homesList: number; buyerAgent: number }>();
  const byCampaignScenario = new Map<string, Record<RoadmapCohort, number>>();
  const add = (label: string, field: "roadmap" | "completedChats" | "homesList" | "buyerAgent") => {
    const current = byCampaign.get(label) ?? { roadmap: 0, completedChats: 0, homesList: 0, buyerAgent: 0 };
    current[field] += 1;
    byCampaign.set(label, current);
  };
  roadmap.forEach((lead) => {
    const label = campaignLabel(lead);
    add(label, "roadmap");
    const cohorts = byCampaignScenario.get(label) ?? { buydown: 0, costOfWaiting: 0, both: 0, noCalculator: 0 };
    cohorts[roadmapCohort(lead.scenario)] += 1;
    byCampaignScenario.set(label, cohorts);
  });
  chats.forEach((lead) => {
    const label = campaignLabel(lead);
    if (lead.status === "qualified") add(label, "completedChats");
    if (lead.lowDownPaymentHomeSearch === 1) add(label, "homesList");
    if (lead.buyerAgentRequest === 1) add(label, "buyerAgent");
  });
  const rows = Array.from(byCampaign.entries())
    .map(([label, counts]) => ({ label, ...counts, total: counts.roadmap + counts.completedChats }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  const cohortRows = Array.from(byCampaignScenario.entries())
    .map(([label, counts]) => ({ label, ...counts, total: counts.buydown + counts.costOfWaiting + counts.both + counts.noCalculator }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

  const cards = [
    { label: "Roadmap requests", value: roadmap.length, icon: FileText, tone: "text-primary bg-primary/10" },
    { label: "Completed chat intakes", value: qualifiedChats.length, icon: MessageCircle, tone: "text-violet-700 bg-violet-600/10" },
    { label: "Homes-list requests", value: homesListRequests.length, icon: MapPinned, tone: "text-emerald-700 bg-emerald-600/10" },
    { label: "Buyer-agent requests", value: buyerAgentRequests.length, icon: UsersRound, tone: "text-amber-800 bg-amber-500/15" },
  ];

  return (
    <section id="campaign-funnel" className="scroll-mt-24 mb-10 rounded-xl border border-primary/20 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 font-display text-2xl font-semibold text-foreground"><BarChart3 className="h-6 w-6 text-primary" /> Campaign funnel</h1>
          <p className="mt-1 text-sm text-muted-foreground">First-touch campaign attribution from Roadmap and mortgage-chat submissions. Browser conversion events remain tag-ready only until approved platform tracking is configured.</p>
        </div>
        <span className="text-xs text-muted-foreground">{roadmapQuery.isFetching || chatQuery.isFetching ? "Refreshing…" : "Dashboard attribution"}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-border bg-background/60 p-4">
            <div className={`flex h-8 w-8 items-center justify-center rounded-md ${tone}`}><Icon className="h-4 w-4" /></div>
            <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[680px] text-sm">
          <thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground"><th className="px-4 py-2.5 font-semibold">First-touch campaign</th><th className="px-4 py-2.5 text-right font-semibold">Roadmap</th><th className="px-4 py-2.5 text-right font-semibold">Completed chat</th><th className="px-4 py-2.5 text-right font-semibold">Homes list</th><th className="px-4 py-2.5 text-right font-semibold">Buyer agent</th></tr></thead>
          <tbody>{rows.length ? rows.map((row) => <tr key={row.label} className="border-b border-border/60 last:border-0"><td className="px-4 py-3 font-medium text-foreground">{row.label}</td><td className="px-4 py-3 text-right">{row.roadmap}</td><td className="px-4 py-3 text-right">{row.completedChats}</td><td className="px-4 py-3 text-right">{row.homesList}</td><td className="px-4 py-3 text-right">{row.buyerAgent}</td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No funnel submissions yet. UTM-tagged campaign traffic will appear here after the first Roadmap or chat submission.</td></tr>}</tbody>
        </table>
      </div>
      <div className="mt-5 overflow-x-auto rounded-lg border border-border">
        <div className="border-b border-border bg-muted/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Roadmap calculator cohorts by campaign</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Use this view to compare which tagged campaigns lead visitors to engage with the 2-1 buydown or cost-of-waiting education before requesting the Roadmap.</p>
        </div>
        <table className="w-full min-w-[820px] text-sm">
          <thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground"><th className="px-4 py-2.5 font-semibold">First-touch campaign</th><th className="px-4 py-2.5 text-right font-semibold">2-1 buydown</th><th className="px-4 py-2.5 text-right font-semibold">Cost of waiting</th><th className="px-4 py-2.5 text-right font-semibold">Both calculators</th><th className="px-4 py-2.5 text-right font-semibold">No calculator</th><th className="px-4 py-2.5 text-right font-semibold">Roadmap total</th></tr></thead>
          <tbody>{cohortRows.length ? cohortRows.map((row) => <tr key={row.label} className="border-b border-border/60 last:border-0"><td className="px-4 py-3 font-medium text-foreground">{row.label}</td><td className="px-4 py-3 text-right">{row.buydown}</td><td className="px-4 py-3 text-right">{row.costOfWaiting}</td><td className="px-4 py-3 text-right">{row.both}</td><td className="px-4 py-3 text-right">{row.noCalculator}</td><td className="px-4 py-3 text-right font-medium">{row.total}</td></tr>) : <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Calculator cohorts will appear after Roadmap leads arrive with saved scenario data.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  );
}
