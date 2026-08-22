import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculatePairingSpendSummary, isMoneySplitAttentionRequired } from "@shared/pairingSpendTracker";
import { AlertTriangle, BarChart3, CalendarDays, CircleDollarSign, HandCoins, Plus, ShieldAlert, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";

type Officer = { id: number; name: string; visible: number };
type Agent = { id: number; name: string; visible: number };
type SpendCategory = "ad_spend" | "event" | "print" | "digital" | "other";

const NONE = "__none__";
const CATEGORY_LABELS: Record<SpendCategory, string> = {
  ad_spend: "Ad spend",
  event: "Event",
  print: "Print / mail",
  digital: "Digital tools",
  other: "Other",
};

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const today = () => new Date().toISOString().slice(0, 10);

function toCents(value: string) {
  const parsed = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

export default function PairingSpendTracker() {
  const utils = trpc.useUtils();
  const officersQuery = trpc.loanOfficer.list.useQuery();
  const agentsQuery = trpc.agent.list.useQuery();
  const trackersQuery = trpc.pairingSpendTracker.list.useQuery();
  const officers = (officersQuery.data ?? []) as Officer[];
  const agents = (agentsQuery.data ?? []) as Agent[];
  const trackers = trackersQuery.data ?? [];
  const officerById = useMemo(() => new Map(officers.map((officer) => [officer.id, officer])), [officers]);
  const agentById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const [selectedOfficerId, setSelectedOfficerId] = useState(NONE);
  const [selectedAgentId, setSelectedAgentId] = useState(NONE);
  const [selectedTrackerId, setSelectedTrackerId] = useState(NONE);
  const [spentOn, setSpentOn] = useState(today);
  const [category, setCategory] = useState<SpendCategory>("ad_spend");
  const [description, setDescription] = useState("");
  const [loanOfficerAmount, setLoanOfficerAmount] = useState("");
  const [agentAmount, setAgentAmount] = useState("");

  useEffect(() => {
    if (selectedTrackerId === NONE && trackers[0]) setSelectedTrackerId(String(trackers[0].id));
  }, [trackers, selectedTrackerId]);

  const selectedTracker = trackers.find((tracker) => String(tracker.id) === selectedTrackerId) ?? null;
  const summary = calculatePairingSpendSummary(selectedTracker?.entries ?? []);
  const attention = isMoneySplitAttentionRequired(summary);

  const refresh = async () => {
    await utils.pairingSpendTracker.list.invalidate();
  };

  const createPairing = trpc.pairingSpendTracker.createPairing.useMutation({
    onSuccess: async (pairing) => {
      setSelectedTrackerId(String(pairing.id));
      setSelectedOfficerId(NONE);
      setSelectedAgentId(NONE);
      await refresh();
      toast.success("Private spend tracker pairing ready.");
    },
    onError: (error) => toast.error(error.message),
  });

  const addEntry = trpc.pairingSpendTracker.addEntry.useMutation({
    onSuccess: async () => {
      setDescription("");
      setLoanOfficerAmount("");
      setAgentAmount("");
      setSpentOn(today());
      await refresh();
      toast.success("Spend entry added.");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteEntry = trpc.pairingSpendTracker.deleteEntry.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("Spend entry removed.");
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePairing = trpc.pairingSpendTracker.deletePairing.useMutation({
    onSuccess: async () => {
      setSelectedTrackerId(NONE);
      await refresh();
      toast.success("Private pairing tracker removed.");
    },
    onError: (error) => toast.error(error.message),
  });

  const submitEntry = () => {
    if (!selectedTracker) return;
    const loanOfficerCents = toCents(loanOfficerAmount);
    const agentCents = toCents(agentAmount);
    if (!description.trim()) return toast.error("Enter a short expense description.");
    if (loanOfficerCents === null || agentCents === null) return toast.error("Use valid non-negative dollar amounts.");
    if (loanOfficerCents + agentCents === 0) return toast.error("Enter a contribution from at least one side.");
    addEntry.mutate({ pairingId: selectedTracker.id, spentOn, category, description: description.trim(), loanOfficerCents, agentCents });
  };

  const selectedOfficer = selectedTracker ? officerById.get(selectedTracker.loanOfficerId) : null;
  const selectedAgent = selectedTracker ? agentById.get(selectedTracker.agentId) : null;

  return (
    <section className="mt-12 scroll-mt-24 border-t border-border pt-10" aria-labelledby="pairing-spend-tracker-heading">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 id="pairing-spend-tracker-heading" className="flex items-center gap-2 font-display text-3xl font-semibold text-foreground"><HandCoins className="h-7 w-7 text-primary" /> LO+Agent Pairings 50/50 Spend Tracker</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Private internal ledger for recording shared campaign expenses by selected loan-officer and agent pairing. Entries remain inside this owner dashboard and are not sent to agents.</p>
        </div>
        <div className="max-w-xl rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-950"><ShieldAlert className="mr-1 inline h-3.5 w-3.5" />Internal management aid only. The 40%–60% indicator is a review prompt, not a RESPA or legal compliance determination; have corporate compliance or qualified counsel confirm any arrangement.</div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="grid gap-1.5 text-sm font-medium"><span>Loan officer</span><Select value={selectedOfficerId} onValueChange={setSelectedOfficerId}><SelectTrigger><SelectValue placeholder="Choose loan officer" /></SelectTrigger><SelectContent><SelectItem value={NONE}>Choose loan officer</SelectItem>{officers.map((officer) => <SelectItem key={officer.id} value={String(officer.id)}>{officer.name}{officer.visible === 1 ? "" : " · hidden profile"}</SelectItem>)}</SelectContent></Select></label>
          <label className="grid gap-1.5 text-sm font-medium"><span>Agent partner</span><Select value={selectedAgentId} onValueChange={setSelectedAgentId}><SelectTrigger><SelectValue placeholder="Choose agent" /></SelectTrigger><SelectContent><SelectItem value={NONE}>Choose agent</SelectItem>{agents.map((agent) => <SelectItem key={agent.id} value={String(agent.id)}>{agent.name}{agent.visible === 1 ? "" : " · hidden profile"}</SelectItem>)}</SelectContent></Select></label>
          <Button disabled={selectedOfficerId === NONE || selectedAgentId === NONE || createPairing.isPending} onClick={() => createPairing.mutate({ loanOfficerId: Number(selectedOfficerId), agentId: Number(selectedAgentId) })}><Plus className="mr-1.5 h-4 w-4" />Create pairing tracker</Button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 font-semibold"><UsersRound className="h-4 w-4 text-primary" /> Pairing trackers</div>
          {trackersQuery.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading private trackers…</p> : trackers.length === 0 ? <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Create a loan-officer and agent pairing above to begin an internal expense ledger.</p> : <><p className="mt-2 text-xs text-muted-foreground">{trackers.length} active {trackers.length === 1 ? "pairing" : "pairings"} · scroll for more</p><div tabIndex={0} aria-label="Active pairing trackers" className="mt-2 h-[22rem] space-y-2 overflow-y-scroll overscroll-contain pr-2 outline-none [scrollbar-gutter:stable] focus-visible:ring-2 focus-visible:ring-ring/40 xl:h-[28rem]">{trackers.map((tracker) => {
            const officer = officerById.get(tracker.loanOfficerId)?.name ?? `Loan officer #${tracker.loanOfficerId}`;
            const agent = agentById.get(tracker.agentId)?.name ?? `Agent #${tracker.agentId}`;
            const trackerSummary = calculatePairingSpendSummary(tracker.entries);
            return <button key={tracker.id} type="button" onClick={() => setSelectedTrackerId(String(tracker.id))} className={`w-full rounded-lg border p-3 text-left transition ${tracker.id === selectedTracker?.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/40"}`}><div className="font-medium text-foreground">{officer}</div><div className="mt-0.5 text-xs text-muted-foreground">+ {agent}</div><div className={`mt-2 text-xs font-semibold ${isMoneySplitAttentionRequired(trackerSummary) ? "text-destructive" : "text-emerald-700"}`}>{trackerSummary.totalCents === 0 ? "No spend recorded" : `${trackerSummary.loanOfficerPercent.toFixed(0)}% LO · ${trackerSummary.agentPercent.toFixed(0)}% agent`}</div></button>;
          })}</div></>}
        </aside>

        <div className="min-w-0 max-h-[42rem] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-4 pr-3 shadow-sm [scrollbar-gutter:stable] sm:p-5 sm:pr-4 xl:max-h-[54rem]">
          {!selectedTracker ? <div className="grid min-h-72 place-items-center text-center"><div><CircleDollarSign className="mx-auto h-9 w-9 text-muted-foreground/60" /><p className="mt-3 font-medium">Select or create a pairing tracker</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">Each pairing maintains its own internal spend rows and allocation view.</p></div></div> : <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Active pairing</p><h3 className="mt-1 font-display text-2xl font-semibold">{selectedOfficer?.name ?? "Loan officer"} <span className="text-muted-foreground">+</span> {selectedAgent?.name ?? "Agent"}</h3></div><Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={deletePairing.isPending} onClick={() => { if (window.confirm("Remove this private pairing tracker and all of its spend rows?")) deletePairing.mutate({ id: selectedTracker.id }); }}><Trash2 className="mr-1.5 h-4 w-4" />Remove tracker</Button></div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-primary/8 p-3"><p className="text-xs font-semibold text-muted-foreground">Total recorded</p><p className="mt-1 text-2xl font-semibold">{money(summary.totalCents)}</p></div><div className={`rounded-lg p-3 ${attention ? "bg-destructive/10" : "bg-emerald-600/10"}`}><p className="text-xs font-semibold text-muted-foreground">Loan officer share</p><p className={`mt-1 text-2xl font-semibold ${attention ? "text-destructive" : "text-emerald-700"}`}>{summary.loanOfficerPercent.toFixed(1)}%</p><p className="text-xs text-muted-foreground">{money(summary.loanOfficerCents)}</p></div><div className={`rounded-lg p-3 ${attention ? "bg-destructive/10" : "bg-emerald-600/10"}`}><p className="text-xs font-semibold text-muted-foreground">Agent share</p><p className={`mt-1 text-2xl font-semibold ${attention ? "text-destructive" : "text-emerald-700"}`}>{summary.agentPercent.toFixed(1)}%</p><p className="text-xs text-muted-foreground">{money(summary.agentCents)}</p></div></div>
            <div className="mt-4 rounded-lg border border-border p-3"><div className="flex items-center justify-between gap-3 text-xs font-semibold"><span>Allocation view</span><span className={attention ? "text-destructive" : "text-emerald-700"}>{summary.totalCents === 0 ? "Add an expense to begin" : attention ? "Attention: outside 40%–60% review range" : "Within 40%–60% review range"}</span></div><div className="relative mt-3 h-4 overflow-hidden rounded-full bg-muted"><div className={`h-full transition-all ${attention ? "bg-destructive" : "bg-primary"}`} style={{ width: `${summary.loanOfficerPercent}%` }} /><div className="absolute inset-y-0 left-1/2 border-l-2 border-card" /></div><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>LO {summary.loanOfficerPercent.toFixed(1)}%</span><span className="font-semibold">50 / 50 target</span><span>Agent {summary.agentPercent.toFixed(1)}%</span></div></div>

            <div className="mt-6 border-t border-border pt-5"><div className="flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4 text-primary" /> Add internal spend row</div><div className="mt-3 grid gap-3 lg:grid-cols-6"><label className="grid gap-1 text-xs font-medium"><span>Date</span><Input type="date" value={spentOn} onChange={(event) => setSpentOn(event.target.value)} /></label><label className="grid gap-1 text-xs font-medium"><span>Category</span><Select value={category} onValueChange={(value) => setCategory(value as SpendCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(CATEGORY_LABELS) as SpendCategory[]).map((value) => <SelectItem key={value} value={value}>{CATEGORY_LABELS[value]}</SelectItem>)}</SelectContent></Select></label><label className="grid gap-1 text-xs font-medium lg:col-span-2"><span>Description</span><Input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} placeholder="e.g., Meta campaign invoice" /></label><label className="grid gap-1 text-xs font-medium"><span>LO paid</span><Input inputMode="decimal" value={loanOfficerAmount} onChange={(event) => setLoanOfficerAmount(event.target.value)} placeholder="$0.00" /></label><label className="grid gap-1 text-xs font-medium"><span>Agent paid</span><Input inputMode="decimal" value={agentAmount} onChange={(event) => setAgentAmount(event.target.value)} placeholder="$0.00" /></label></div><Button className="mt-3" disabled={addEntry.isPending} onClick={submitEntry}><Plus className="mr-1.5 h-4 w-4" />Add spend row</Button></div>

            <div className="mt-6 overflow-hidden rounded-lg border border-border"><div className="max-h-[20rem] overflow-y-scroll overscroll-contain [scrollbar-gutter:stable] xl:max-h-[24rem]" aria-label="Spend row history"><table className="w-full min-w-[720px] text-sm"><thead className="sticky top-0 z-10"><tr className="border-b border-border bg-muted/95 text-left text-xs text-muted-foreground backdrop-blur-sm"><th className="px-3 py-3 font-semibold">Date</th><th className="px-3 py-3 font-semibold">Category</th><th className="px-3 py-3 font-semibold">Description</th><th className="px-3 py-3 text-right font-semibold">LO paid</th><th className="px-3 py-3 text-right font-semibold">Agent paid</th><th className="px-3 py-3 text-right font-semibold">Total</th><th className="px-3 py-3" /></tr></thead><tbody>{selectedTracker.entries.length === 0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No expense rows for this pairing yet.</td></tr> : selectedTracker.entries.map((entry) => <tr key={entry.id} className="border-b border-border/60 last:border-0"><td className="px-3 py-3 whitespace-nowrap"><CalendarDays className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />{new Date(entry.spentOn).toLocaleDateString()}</td><td className="px-3 py-3"><span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{CATEGORY_LABELS[entry.category as SpendCategory]}</span></td><td className="px-3 py-3 font-medium">{entry.description}</td><td className="px-3 py-3 text-right tabular-nums">{money(entry.loanOfficerCents)}</td><td className="px-3 py-3 text-right tabular-nums">{money(entry.agentCents)}</td><td className="px-3 py-3 text-right font-semibold tabular-nums">{money(entry.loanOfficerCents + entry.agentCents)}</td><td className="px-3 py-3 text-right"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${entry.description}`} onClick={() => deleteEntry.mutate({ pairingId: selectedTracker.id, entryId: entry.id })}><Trash2 className="h-4 w-4" /></Button></td></tr>)}</tbody><tfoot><tr className="sticky bottom-0 bg-muted/95 text-sm font-semibold backdrop-blur-sm"><td colSpan={3} className="px-3 py-3">Column totals</td><td className="px-3 py-3 text-right tabular-nums">{money(summary.loanOfficerCents)}</td><td className="px-3 py-3 text-right tabular-nums">{money(summary.agentCents)}</td><td className="px-3 py-3 text-right tabular-nums">{money(summary.totalCents)}</td><td /></tr></tfoot></table></div></div>
          </>}
        </div>
      </div>
    </section>
  );
}
