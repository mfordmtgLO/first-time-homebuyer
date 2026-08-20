import { useEffect, useMemo, useRef, useState } from "react";
import { useRoute } from "wouter";
import { AgentPageProvider } from "@/contexts/AgentPageContext";
import { ScenarioProvider, useScenario } from "@/contexts/ScenarioContext";
import LeadMagnet from "@/components/landing/LeadMagnet";
import Buydown from "@/components/landing/Buydown";
import CostOfWaiting from "@/components/landing/CostOfWaiting";
import Footer from "@/components/landing/Footer";
import MortgageChatWidget from "@/components/MortgageChatWidget";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { getPropertyHeroMedia, parsePropertyLandingSnapshot, propertyEligibilityLabel } from "@shared/propertyLandingPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Bath, BedDouble, Building2, CalendarCheck, CalendarDays, ChevronLeft, ExternalLink, Facebook, Globe2, Home, Info, Instagram, Linkedin, Mail, MapPin, Phone, Printer, Ruler, Share2, ShieldCheck, SquareStack, Trees, UserRound, UsersRound, X } from "lucide-react";

const money = (value: number | null) => value === null ? "Not in saved snapshot" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const number = (value: number | null) => value === null ? "Not in saved snapshot" : value.toLocaleString("en-US");
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] ?? character));
function FactTooltip({ children }: { children: React.ReactNode }) {
  return <Tooltip><TooltipTrigger asChild><button type="button" className="ml-1 inline-flex align-middle text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-label="How this saved property cost is used"><Info className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent className="max-w-64 text-xs leading-relaxed">{children}</TooltipContent></Tooltip>;
}

function SavedLocationMap({ latitude, longitude, address }: { latitude: number; longitude: number; address: string }) {
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  return (
    <MapView
      className="h-[320px] overflow-hidden rounded-xl border border-border shadow-sm"
      initialCenter={{ lat: latitude, lng: longitude }}
      initialZoom={15}
      onMapReady={(map) => {
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: latitude, lng: longitude },
          title: address,
        });
        const info = new google.maps.InfoWindow({
          content: `<div style="max-width:220px;font-family:Arial,sans-serif"><strong>Saved GeoSphere location</strong><br/>${address}<br/><span style="font-size:12px">Point-in-time location from the saved listing snapshot. Confirm current listing details.</span></div>`,
        });
        marker.addListener("click", () => info.open({ map, anchor: marker }));
        markerRef.current = marker;
      }}
    />
  );
}

function PropertyImageUnavailable() {
  return <div className="grid h-[330px] place-items-center bg-[radial-gradient(circle_at_30%_20%,oklch(0.83_0.1_84),transparent_38%),linear-gradient(135deg,oklch(0.31_0.05_155),oklch(0.17_0.03_152))] px-8 text-center text-primary-foreground"><div><Home className="mx-auto mb-3 h-12 w-12"/><p className="font-display text-2xl">Saved property details</p><p className="mt-2 text-sm text-primary-foreground/80">Listing imagery was not included in this saved snapshot.</p></div></div>;
}

type PublicTeamProfile = {
  name: string;
  title?: string | null;
  nmls?: string | null;
  companyName: string;
  email: string;
  phone: string;
  website: string;
  calendlyUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  bio?: string | null;
  headshotUrl: string;
  companyLogoUrl: string;
};
const profileInitials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "Team";
const publicHttpUrl = (value: string | null | undefined) => /^https?:\/\//i.test(value?.trim() ?? "") ? value!.trim() : "";

function TeamProfileCard({ profile, role, showNmls = false, onCalendarClick }: { profile: PublicTeamProfile; role: string; showNmls?: boolean; onCalendarClick?: () => void }) {
  const website = publicHttpUrl(profile.website);
  const calendlyUrl = publicHttpUrl(profile.calendlyUrl);
  const socialLinks = !showNmls ? [
    { label: "Facebook", url: publicHttpUrl(profile.facebookUrl), Icon: Facebook },
    { label: "Instagram", url: publicHttpUrl(profile.instagramUrl), Icon: Instagram },
    { label: "LinkedIn", url: publicHttpUrl(profile.linkedinUrl), Icon: Linkedin },
  ].filter((link) => Boolean(link.url)) : [];
  return <article className="rounded-xl border border-border bg-background p-4 shadow-sm"><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">{role}</p><div className="mt-3 flex items-start gap-3">{profile.headshotUrl ? <img src={profile.headshotUrl} alt={`${profile.name} headshot`} className="h-16 w-16 shrink-0 rounded-full border border-border object-cover" /> : <div aria-label={`${profile.name} profile placeholder`} className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{profileInitials(profile.name)}</div>}<div className="min-w-0 flex-1"><h3 className="font-display text-xl font-semibold leading-tight text-foreground">{profile.name}</h3><p className="mt-0.5 text-sm font-medium text-muted-foreground">{profile.title || (showNmls ? "Loan Officer" : "Co-marketing Real Estate Agent")}{showNmls && profile.nmls ? ` · NMLS #${profile.nmls}` : ""}</p>{profile.companyLogoUrl ? <img src={profile.companyLogoUrl} alt={`${profile.companyName} logo`} className="mt-2 h-7 max-w-40 object-contain object-left" /> : <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><Building2 className="h-3.5 w-3.5 text-primary" />{profile.companyName}</p>}</div></div>{profile.companyLogoUrl && profile.companyName ? <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><Building2 className="h-3.5 w-3.5 text-primary" />{profile.companyName}</p> : null}<div className="mt-4 grid gap-2 border-t border-border pt-3 text-sm">{profile.phone ? <a className="inline-flex items-center gap-2 font-medium text-primary hover:underline" href={`tel:${profile.phone.replace(/[^\d+]/g, "")}`}><Phone className="h-3.5 w-3.5" />{profile.phone}</a> : null}{profile.email ? <a className="inline-flex min-w-0 items-center gap-2 font-medium text-primary hover:underline" href={`mailto:${profile.email}`}><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{profile.email}</span></a> : null}{website ? <a className="inline-flex min-w-0 items-center gap-2 font-medium text-primary hover:underline" href={website} target="_blank" rel="noreferrer"><Globe2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Visit profile</span><ExternalLink className="h-3 w-3 shrink-0" /></a> : null}{showNmls && calendlyUrl ? <a className="mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 font-semibold text-primary-foreground transition hover:brightness-110" href={calendlyUrl} target="_blank" rel="noreferrer" onClick={onCalendarClick}><CalendarCheck className="h-4 w-4" />Schedule a call</a> : null}{socialLinks.length ? <div className="mt-1 flex items-center gap-2"><span className="text-xs font-medium text-muted-foreground">Social:</span>{socialLinks.map(({ label, url, Icon }) => <a key={label} href={url} target="_blank" rel="noreferrer" aria-label={`${profile.name} on ${label}`} title={`${profile.name} on ${label}`} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/25 text-primary transition hover:bg-primary hover:text-primary-foreground"><Icon className="h-4 w-4" /></a>)}</div> : null}</div></article>;
}

function PropertyTeamBranding({ officer, agent, onCalendarClick, isOpen, onOpenChange }: { officer: PublicTeamProfile | null; agent: PublicTeamProfile | null; onCalendarClick: () => void; isOpen: boolean; onOpenChange: (open: boolean) => void }) {

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onOpenChange]);

  if (!officer || !agent) return <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950"><div className="flex items-center gap-2 font-semibold"><UserRound className="h-4 w-4" />Co-branded team profile pending</div><p className="mt-2 leading-relaxed">This saved property page needs an active dashboard loan-officer and agent pairing before it can display the complete local contact team.</p></div>;
  return <div className="property-print-hide">{isOpen ? <button type="button" aria-label="Close your local homebuying team" className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-[1px]" onClick={() => onOpenChange(false)} /> : null}<aside id="property-team-drawer" aria-label="Your local homebuying team" className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform duration-200 ${isOpen ? "translate-x-0" : "translate-x-full"}`}><div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Co-branded property page</p><h2 className="mt-1 font-display text-2xl font-semibold">Your local homebuying team</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Direct contacts for this saved property page.</p></div><Button size="icon" variant="ghost" aria-label="Close team panel" onClick={() => onOpenChange(false)}><X className="h-5 w-5" /></Button></div><div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 [scrollbar-gutter:stable]"><TeamProfileCard profile={officer} role="Your loan officer" showNmls onCalendarClick={onCalendarClick} /><TeamProfileCard profile={agent} role="Your co-marketing real estate agent" /></div></aside></div>;
}

function PropertyActivityTracker({ slug }: { slug: string }) {
  const { scenario, cowScenario } = useScenario();
  const track = trpc.propertyPages.trackActivity.useMutation();
  const seen = useRef(new Set<string>());

  const recordOnce = (eventType: "page_view" | "buydown_calculator" | "cost_of_waiting_calculator") => {
    if (seen.current.has(eventType)) return;
    seen.current.add(eventType);
    track.mutate({ slug, eventType });
  };

  useEffect(() => { recordOnce("page_view"); }, [slug]);
  useEffect(() => { if (scenario) recordOnce("buydown_calculator"); }, [scenario]);
  useEffect(() => { if (cowScenario) recordOnce("cost_of_waiting_calculator"); }, [cowScenario]);
  return null;
}

const PROPERTY_NAV_SECTIONS = [
  { id: "property-details", label: "Property details" },
  { id: "buydown", label: "2-1 Buydown" },
  { id: "cost-of-waiting", label: "Cost of Waiting" },
  { id: "roadmap", label: "Roadmap" },
  { id: "chat-intake", label: "Chat intake" },
] as const;

function PropertySectionNavigator({ onTeamClick, isTeamOpen }: { onTeamClick: () => void; isTeamOpen: boolean }) {
  const [activeSection, setActiveSection] = useState<string>("property-details");

  useEffect(() => {
    const observedSections = PROPERTY_NAV_SECTIONS
      .filter((section) => section.id !== "chat-intake")
      .map((section) => document.getElementById(section.id))
      .filter((section): section is HTMLElement => Boolean(section));
    const updateActiveSection = () => {
      const scanLine = window.scrollY + 132;
      const current = observedSections.reduce<string>((active, section) => section.offsetTop <= scanLine ? section.id : active, observedSections[0]?.id ?? "property-details");
      setActiveSection(current);
    };
    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  const navigate = (id: (typeof PROPERTY_NAV_SECTIONS)[number]["id"]) => {
    if (id === "chat-intake") {
      window.dispatchEvent(new Event("open-mortgage-chat"));
      return;
    }
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <nav aria-label="Property page sections" className="sticky top-0 z-30 border-b border-border bg-card/95 shadow-sm backdrop-blur property-print-hide"><div className="flex w-full items-center gap-2 px-3 sm:px-5"><div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]"><div className="flex min-w-max items-center gap-1 py-2">{PROPERTY_NAV_SECTIONS.map((section) => <button key={section.id} type="button" onClick={() => navigate(section.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${section.id === "chat-intake" ? "bg-primary text-primary-foreground hover:brightness-110" : activeSection === section.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{section.label}</button>)}</div></div><button type="button" onClick={onTeamClick} aria-expanded={isTeamOpen} aria-controls="property-team-drawer" className="btn-press shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><span className="inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" /><span className="hidden sm:inline">Meet your team</span><span className="sm:hidden">Team</span></span></button></div></nav>;
}

function CalculatorEligibilityBadges({ isLmi, isUsda, dark = false }: { isLmi: boolean; isUsda: boolean; dark?: boolean }) {
  const labelClass = dark ? "text-primary-foreground/65" : "text-muted-foreground";
  const noteClass = dark ? "text-primary-foreground/70" : "text-muted-foreground";
  return <div className="container property-print-hide"><div className="flex flex-wrap gap-3 pb-3 pt-6"><span className={`w-full text-xs font-semibold uppercase tracking-[0.13em] ${labelClass}`}>Saved program screen</span>{isLmi && <div className="max-w-md"><Badge className="bg-amber-100 text-amber-950 hover:bg-amber-100">OHCS Flex Lending screen</Badge><p className={`mt-1.5 text-xs leading-relaxed ${noteClass}`}>This saved property is within an LMI-screened area used for OHCS Flex Lending outreach. Buyer income, loan, and program requirements still require current verification.</p></div>}{isUsda && <div className="max-w-md"><Badge className="bg-emerald-100 text-emerald-950 hover:bg-emerald-100">USDA RD screen</Badge><p className={`mt-1.5 text-xs leading-relaxed ${noteClass}`}>The saved map screen places this property outside USDA’s ineligible urban overlays. Address, household, and program requirements must still be confirmed.</p></div>}{!isLmi && !isUsda && <div><Badge variant="outline" className={dark ? "border-white/25 text-primary-foreground/75" : "text-muted-foreground"}>No saved Flex or USDA screen</Badge><p className={`mt-1.5 text-xs ${noteClass}`}>No program screen is stored with this snapshot; ask your loan officer to review current options.</p></div>}</div></div>;
}

function BuyerCalculationActions({ propertyAddress, propertyUrl, isLmi, isUsda, contactLines, onEmailIntent }: { propertyAddress: string; propertyUrl: string; isLmi: boolean; isUsda: boolean; contactLines: string[]; onEmailIntent: () => void }) {
  const { scenario, cowScenario } = useScenario();
  const calculationSummary = () => [
    `Buyer calculation summary for ${propertyAddress}`,
    scenario ? `2-1 Buydown: ${money(scenario.purchasePrice)} purchase price, ${scenario.noteRate.toFixed(3).replace(/\.?0+$/, "")}% note rate, ${money(scenario.year1MonthlySavings)} monthly savings in year one, ${money(scenario.year2MonthlySavings)} monthly savings in year two, and ${money(scenario.totalSubsidy)} estimated seller-paid interest subsidy.` : "2-1 Buydown: no scenario was run yet.",
    cowScenario ? `Cost of Waiting: ${cowScenario.waitYears} year${cowScenario.waitYears === 1 ? "" : "s"}; ${money(cowScenario.totalRentPaid)} rent paid, ${money(cowScenario.equityGained)} potential equity if buying now, and ${money(cowScenario.costOfWaiting)} estimated cost of waiting.` : "Cost of Waiting: no scenario was run yet.",
    "Educational estimates only; current terms, eligibility, and approval require verification.",
    `Property page: ${propertyUrl}`,
  ].join("\n\n");
  const printCalculationPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow pop-ups to create your buyer PDF summary.");
      return;
    }
    printWindow.opener = null;
    const programScreening = [isLmi ? "OHCS Flex Lending screen" : null, isUsda ? "USDA RD screen" : null].filter(Boolean).join(" · ") || "No saved Flex or USDA screen";
    const buydownRows = scenario ? `<tr><th>Purchase price</th><td>${money(scenario.purchasePrice)}</td></tr><tr><th>Down payment</th><td>${money(scenario.downPayment)}</td></tr><tr><th>Illustrative note rate</th><td>${scenario.noteRate.toFixed(3).replace(/\.?0+$/, "")}%</td></tr><tr><th>Year 1 potential savings</th><td>${money(scenario.year1MonthlySavings)} monthly</td></tr><tr><th>Year 2 potential savings</th><td>${money(scenario.year2MonthlySavings)} monthly</td></tr><tr><th>Estimated seller-paid interest subsidy</th><td>${money(scenario.totalSubsidy)}</td></tr>` : `<tr><td>This buyer did not run a 2-1 Buydown scenario yet.</td></tr>`;
    const waitingRows = cowScenario ? `<tr><th>Waiting period</th><td>${cowScenario.waitYears} year${cowScenario.waitYears === 1 ? "" : "s"}</td></tr><tr><th>Monthly rent</th><td>${money(cowScenario.monthlyRent)}</td></tr><tr><th>Rent paid while waiting</th><td>${money(cowScenario.totalRentPaid)}</td></tr><tr><th>Equity if buying now</th><td>${money(cowScenario.equityGained)}</td></tr><tr><th>Estimated cost of waiting</th><td>${money(cowScenario.costOfWaiting)}</td></tr>` : `<tr><td>This buyer did not run a Cost of Waiting scenario yet.</td></tr>`;
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Buyer calculation summary — ${escapeHtml(propertyAddress)}</title><style>body{font-family:Arial,sans-serif;color:#1d3128;margin:42px;line-height:1.45}h1{font-family:Georgia,serif;font-size:28px;margin:0 0 4px}h2{font-family:Georgia,serif;margin:28px 0 10px;color:#153f30}.tag{display:inline-block;background:#e8b442;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:700}.note{color:#56645e;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #d8dfdb;padding:9px;text-align:left;font-size:14px}th{width:48%;color:#50645a}.contacts{margin-top:28px;background:#f3f6f3;border:1px solid #d8dfdb;padding:16px}.contacts strong{display:block;margin-bottom:6px}.disclaimer{margin-top:30px;border-top:1px solid #d8dfdb;padding-top:14px;font-size:10px;color:#56645e}@media print{body{margin:0}}</style></head><body><div class="tag">Buyer calculation summary</div><h1>${escapeHtml(propertyAddress)}</h1><p class="note">Saved property page · ${escapeHtml(programScreening)}</p><h2>2-1 Buydown savings scenario</h2><table>${buydownRows}</table><h2>Cost of Waiting scenario</h2><table>${waitingRows}</table><div class="contacts"><strong>Your local homebuying team</strong>${contactLines.map(escapeHtml).join("<br/>")}</div><p class="disclaimer">Educational estimates only—not a payment quote, APR quote, loan estimate, approval, commitment to lend, or eligibility determination. Actual terms depend on the complete application, fees, discount points, seller contributions, closing costs, prepaids, mortgage insurance, and underwriting approval.</p><p class="note">Property page: ${escapeHtml(propertyUrl)}</p><script>window.onload=()=>window.print();<\/script></body></html>`);
    printWindow.document.close();
  };
  const emailCalculationPdf = () => {
    const clientEmail = window.prompt("Enter the client email address for a prepared buyer-summary draft:");
    if (!clientEmail) return;
    onEmailIntent();
    const subject = `Buyer calculation summary — ${propertyAddress}`;
    const body = `Hi,\n\nHere is the buyer calculation summary for ${propertyAddress}. Please see the scenario details below. You can also view the property page here: ${propertyUrl}\n\n${calculationSummary()}\n\nTo include the printable PDF, select “Buyer calculation PDF,” save the browser print dialog as a PDF, and attach it to this message.\n\n${contactLines.join("\n")}`;
    window.location.href = `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  return <><Button size="sm" variant="outline" onClick={printCalculationPdf}><Printer className="mr-1.5 h-4 w-4" />Buyer calculation PDF</Button><Button size="sm" variant="outline" onClick={emailCalculationPdf}><Mail className="mr-1.5 h-4 w-4" />Email PDF summary</Button></>;
}

export default function PropertyLandingPage() {
  const [, params] = useRoute("/property/:slug");
  const slug = params?.slug?.toLowerCase() ?? "";
  const { data, isLoading } = trpc.propertyPages.getPublic.useQuery({ slug }, { enabled: Boolean(slug) });
  const snapshot = useMemo(() => data?.page ? parsePropertyLandingSnapshot(data.page.listingSnapshot) : null, [data?.page?.listingSnapshot]);
  const track = trpc.propertyPages.trackActivity.useMutation();
  const [isTeamDrawerOpen, setTeamDrawerOpen] = useState(false);

  if (isLoading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading saved property details…</div>;
  if (!data?.page || !snapshot) return <div className="min-h-screen grid place-items-center px-6 text-center"><div><h1 className="font-display text-3xl font-semibold">Property page unavailable</h1><p className="mt-3 text-muted-foreground">This saved property page may have been retired or its snapshot is unavailable.</p></div></div>;

  const officer = data.loanOfficer;
  const agent = data.agent;
  const propertyUrl = `https://firsttimehomebuyer.manus.space/property/${data.page.slug}`;
  const eligibility = propertyEligibilityLabel(snapshot);
  const heroMedia = getPropertyHeroMedia(snapshot);
  const externalListingUrl = publicHttpUrl(data.page.externalListingUrl);
  const buyerContactLines = [
    officer ? `${officer.name} · ${officer.title}${officer.nmls ? ` · NMLS #${officer.nmls}` : ""}` : null,
    officer ? `${officer.companyName} · ${officer.phone}${officer.email ? ` · ${officer.email}` : ""}` : null,
    agent ? `${agent.name}${agent.companyName ? ` · ${agent.companyName}` : ""}${agent.phone ? ` · ${agent.phone}` : ""}` : null,
  ].filter((line): line is string => Boolean(line));
  const facts = [
    { label: "Beds", value: snapshot.bedrooms ?? "—", icon: BedDouble },
    { label: "Baths", value: snapshot.bathrooms ?? "—", icon: Bath },
    { label: "Living area", value: snapshot.squareFootage ? `${number(snapshot.squareFootage)} sq ft` : "—", icon: Ruler },
    { label: "Lot", value: snapshot.acreage ? `${snapshot.acreage.toFixed(2)} acres` : snapshot.lotSize ? `${number(snapshot.lotSize)} sq ft` : "—", icon: Trees },
    { label: "Year built", value: snapshot.yearBuilt?.toString() ?? "—", icon: CalendarDays },
    { label: "Property type", value: snapshot.manufacturedHomeType || snapshot.propertyType || "—", icon: Home },
  ];

  return (
    <AgentPageProvider agentSlug={agent?.slug ?? null} loanOfficerSlug={officer?.slug ?? null} propertyPageSlug={data.page.slug}>
      <ScenarioProvider>
        <div className="min-h-screen bg-background text-foreground">
          <PropertyActivityTracker slug={data.page.slug} />
          <style>{`@media print { header, footer, #payment-scenarios, #cost-of-waiting, .property-print-hide, [data-chat-launcher] { display: none !important; } main { color: #111 !important; } }`}</style>
          <header className="property-print-hide border-b border-border bg-card/95 backdrop-blur">
            <div className="container flex flex-wrap items-center justify-between gap-3 py-4">
              <a href="/" className="font-display text-lg font-semibold text-primary">First-Time Homebuyer</a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Saved property snapshot · educational marketing page
              </div>
            </div>
          </header>
          <main>
            <PropertySectionNavigator onTeamClick={() => setTeamDrawerOpen(true)} isTeamOpen={isTeamDrawerOpen} />
            <section className="border-b border-border bg-[linear-gradient(135deg,oklch(0.96_0.025_84),oklch(0.91_0.04_145))] py-10 md:py-16">
              <div className="container grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {snapshot.isLmi && <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">LMI · OHCS Flex Lending screen</Badge>}
                    {snapshot.isUsda && <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">USDA RD screen</Badge>}
                  </div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Saved property spotlight</p>
                  <h1 className="mt-3 font-display text-4xl font-semibold leading-tight md:text-5xl">{snapshot.address}</h1>
                  <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">Explore a first-time-buyer plan around this saved property snapshot, including mortgage questions, estimated payment scenarios, and a personalized Roadmap.</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button size="lg" onClick={() => document.getElementById("roadmap")?.scrollIntoView({ behavior: "smooth" })}>Get the Roadmap</Button>
                    <Button size="lg" variant="outline" onClick={() => document.getElementById("payment-scenarios")?.scrollIntoView({ behavior: "smooth" })}>Explore payment scenarios</Button>
                    {externalListingUrl ? <Button size="lg" variant="outline" asChild><a href={externalListingUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-4 w-4" />View live listing page</a></Button> : null}
                  </div>
                  <div className="property-print-hide mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => { track.mutate({ slug: data.page.slug, eventType: "print_export" }); window.print(); }}><Printer className="mr-1.5 h-4 w-4" />Print / save PDF</Button>
                    <BuyerCalculationActions propertyAddress={snapshot.address} propertyUrl={propertyUrl} isLmi={snapshot.isLmi} isUsda={snapshot.isUsda} contactLines={buyerContactLines} onEmailIntent={() => track.mutate({ slug: data.page.slug, eventType: "email_pdf_summary", detail: "mailto_draft" })} />
                    <Button size="sm" variant="outline" onClick={async () => {
                      track.mutate({ slug: data.page.slug, eventType: "social_share", detail: "native_share" });
                      if (navigator.share) await navigator.share({ title: snapshot.address, text: `Saved property spotlight: ${snapshot.address}`, url: propertyUrl });
                      else await navigator.clipboard?.writeText(propertyUrl);
                    }}><Share2 className="mr-1.5 h-4 w-4" />Share</Button>
                    <Button size="icon" variant="outline" asChild><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(propertyUrl)}`} target="_blank" rel="noreferrer" onClick={() => track.mutate({ slug: data.page.slug, eventType: "social_share", detail: "facebook" })} aria-label="Share on Facebook"><Facebook className="h-4 w-4" /></a></Button>
                    <Button size="icon" variant="outline" asChild><a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(propertyUrl)}`} target="_blank" rel="noreferrer" onClick={() => track.mutate({ slug: data.page.slug, eventType: "social_share", detail: "linkedin" })} aria-label="Share on LinkedIn"><Linkedin className="h-4 w-4" /></a></Button>
                  </div>
                  <p className="mt-6 text-xs leading-relaxed text-muted-foreground">Saved {snapshot.sourceSavedAt ? new Date(snapshot.sourceSavedAt).toLocaleString() : "snapshot date unavailable"}. Price, availability, details, program fit, and lending terms require current verification and approval.</p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                  {heroMedia.kind === "saved_listing_photo" ? <img src={heroMedia.url} alt={`Saved listing view of ${snapshot.address}`} className="h-[330px] w-full object-cover" /> : <PropertyImageUnavailable />}
                  <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
                    {facts.map(({ label, value, icon: Icon }) => <div key={label} className="min-w-0"><div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div><div className="mt-1 truncate font-semibold">{value}</div></div>)}
                  </div>
                </div>
              </div>
            </section>

            <PropertyTeamBranding officer={officer} agent={agent} isOpen={isTeamDrawerOpen} onOpenChange={setTeamDrawerOpen} onCalendarClick={() => track.mutate({ slug: data.page.slug, eventType: "calendar_click", detail: "loan_officer_calendly" })} />
            <section id="property-details" className="scroll-mt-24 py-12 md:py-16">
              <div className="container grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
                  <div className="flex items-center gap-2"><SquareStack className="h-5 w-5 text-primary" /><h2 className="font-display text-2xl font-semibold">Saved property details</h2></div>
                  <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    <div><dt className="text-sm text-muted-foreground">Saved snapshot price</dt><dd className="mt-1 text-xl font-semibold">{money(snapshot.price)}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Screening context</dt><dd className="mt-1 font-semibold">{eligibility}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">MLS reference</dt><dd className="mt-1 font-medium">{[snapshot.mlsName, snapshot.mlsNumber].filter(Boolean).join(" · ") || "Not in saved snapshot"}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Units</dt><dd className="mt-1 font-medium">{snapshot.units ?? "Not in saved snapshot"}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Property taxes<FactTooltip>Saved annual property taxes are divided by 12 for the monthly scenario-planning context. Verify the current tax amount and assessment before relying on it.</FactTooltip></dt><dd className="mt-1 font-medium">{money(snapshot.propertyTaxes)}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">HOA dues<FactTooltip>Saved HOA dues are treated as a monthly planning cost. Confirm the current dues, assessments, and what the association fee includes.</FactTooltip></dt><dd className="mt-1 font-medium">{snapshot.hoaDues === null ? "Not in saved snapshot" : `${money(snapshot.hoaDues)}/month`}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Homeowner insurance</dt><dd className="mt-1 font-medium">{snapshot.homeownerInsurance === null ? "Not in saved snapshot" : `${money(snapshot.homeownerInsurance)}/month`}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Saved status</dt><dd className="mt-1 font-medium">{snapshot.status ?? "Not in saved snapshot"}</dd></div>
                  </dl>
                  {data.page.aiSummary && <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-5"><h3 className="font-semibold text-primary">Property highlights</h3><p className="mt-3 leading-relaxed text-muted-foreground">{data.page.aiSummary}</p><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Dashboard-reviewed draft based only on the saved property snapshot. Any property taxes, HOA dues, and homeowner-insurance amounts shown, when listed, are estimates or saved planning figures—not quotes—and must be independently verified with the county assessor, homeowners association, insurer, listing or transaction parties, and your loan officer before you rely on them for affordability, an offer, or loan planning.</p></div>}
                  {snapshot.description && <div className="mt-8 border-t border-border pt-6"><h3 className="font-semibold">Saved listing description</h3><p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{snapshot.description}</p></div>}
                  <p className="mt-8 rounded-lg bg-muted p-4 text-sm leading-relaxed text-muted-foreground">This page uses a saved GeoSphere listing snapshot, not a live MLS or listing feed. Confirm current status, price, property condition, features, and eligibility with the listing professional and the applicable program requirements before relying on any information.</p>
                </div>
                <aside className="space-y-6">
                  {snapshot.latitude !== null && snapshot.longitude !== null ? <div><div className="mb-3 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><h2 className="font-display text-2xl font-semibold">Saved map location</h2></div><SavedLocationMap latitude={snapshot.latitude} longitude={snapshot.longitude} address={snapshot.address} /><a className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" href="https://geosphere-map-oregon.vercel.app/" target="_blank" rel="noreferrer">Open the GeoSphere map <ExternalLink className="h-3.5 w-3.5" /></a></div> : null}
                </aside>
              </div>
            </section>
            <div id="payment-scenarios">
              <CalculatorEligibilityBadges isLmi={snapshot.isLmi} isUsda={snapshot.isUsda} />
              <div id="buydown" className="scroll-mt-24"><Buydown purchasePrice={snapshot.price ?? undefined} propertyAddress={snapshot.address} monthlyPropertyTaxes={snapshot.propertyTaxes === null ? undefined : snapshot.propertyTaxes / 12} monthlyHoaDues={snapshot.hoaDues ?? undefined} monthlyHomeownerInsurance={snapshot.homeownerInsurance ?? undefined} monthlyMortgageInsurance={snapshot.mortgageInsurance ?? undefined} maxSellerContribution={snapshot.programContributionLimit ?? undefined} /></div>
            </div>
            <section id="cost-of-waiting" className="scroll-mt-24 py-16 text-primary-foreground md:py-20" style={{ background: "oklch(0.27 0.05 162)" }}>
              <div className="container">
                <CalculatorEligibilityBadges isLmi={snapshot.isLmi} isUsda={snapshot.isUsda} dark />
                <div className="max-w-3xl">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[oklch(0.82_0.12_80)]">Build a plan around this home</p>
                  <h2 className="mt-3 font-display text-3xl font-semibold leading-tight md:text-4xl">What could waiting cost you while this opportunity changes?</h2>
                  <p className="mt-4 max-w-2xl leading-relaxed text-primary-foreground/75">Use the calculator below to compare rent paid with the home equity you could build. The estimate is educational and can be saved with your Roadmap request for a conversation about this saved property.</p>
                </div>
                <CostOfWaiting purchasePrice={snapshot.price ?? undefined} propertyAddress={snapshot.address} monthlyPropertyTaxes={snapshot.propertyTaxes === null ? undefined : snapshot.propertyTaxes / 12} monthlyHoaDues={snapshot.hoaDues ?? undefined} monthlyHomeownerInsurance={snapshot.homeownerInsurance ?? undefined} monthlyMortgageInsurance={snapshot.mortgageInsurance ?? undefined} revealImmediately />
              </div>
            </section>
            <div id="roadmap" className="scroll-mt-24"><LeadMagnet /></div>
          </main>
          <Footer />
          <MortgageChatWidget compactWhenIdle />
        </div>
      </ScenarioProvider>
    </AgentPageProvider>
  );
}
