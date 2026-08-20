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
import { toast } from "sonner";
import { BedDouble, Bath, CalendarDays, ExternalLink, Facebook, Home, Linkedin, MapPin, Printer, Ruler, Share2, ShieldCheck, SquareStack, Trees } from "lucide-react";

const money = (value: number | null) => value === null ? "Not in saved snapshot" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const number = (value: number | null) => value === null ? "Not in saved snapshot" : value.toLocaleString("en-US");
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] ?? character));

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

function PropertySectionNavigator() {
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

  return <nav aria-label="Property page sections" className="sticky top-0 z-30 border-b border-border bg-card/95 shadow-sm backdrop-blur property-print-hide"><div className="container overflow-x-auto"><div className="flex min-w-max items-center gap-1 py-2">{PROPERTY_NAV_SECTIONS.map((section) => <button key={section.id} type="button" onClick={() => navigate(section.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${section.id === "chat-intake" ? "bg-primary text-primary-foreground hover:brightness-110" : activeSection === section.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{section.label}</button>)}</div></div></nav>;
}

function CalculatorEligibilityBadges({ isLmi, isUsda }: { isLmi: boolean; isUsda: boolean }) {
  return <div className="container property-print-hide"><div className="flex flex-wrap items-center gap-2 pb-2 pt-6"><span className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">Saved program screen</span>{isLmi && <Badge className="bg-amber-100 text-amber-950 hover:bg-amber-100">OHCS Flex Lending screen</Badge>}{isUsda && <Badge className="bg-emerald-100 text-emerald-950 hover:bg-emerald-100">USDA RD screen</Badge>}{!isLmi && !isUsda && <Badge variant="outline" className="text-muted-foreground">No saved Flex or USDA screen</Badge>}<span className="text-xs text-muted-foreground">Program fit requires current verification and approval.</span></div></div>;
}

function BuyerCalculationPdfButton({ propertyAddress, propertyUrl, isLmi, isUsda }: { propertyAddress: string; propertyUrl: string; isLmi: boolean; isUsda: boolean }) {
  const { scenario, cowScenario } = useScenario();
  const printCalculationPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow pop-ups to create your buyer PDF summary.");
      return;
    }
    printWindow.opener = null;
    const programScreening = [isLmi ? "OHCS Flex Lending screen" : null, isUsda ? "USDA RD screen" : null].filter(Boolean).join(" · ") || "No saved Flex or USDA screen";
    const buydownRows = scenario ? `<tr><th>Purchase price</th><td>${money(scenario.purchasePrice)}</td></tr><tr><th>Down payment</th><td>${money(scenario.downPayment)}</td></tr><tr><th>Note rate</th><td>${scenario.noteRate.toFixed(3).replace(/\.?0+$/, "")}%</td></tr><tr><th>Year 1 payment / savings</th><td>${money(scenario.year1Payment)} / ${money(scenario.year1MonthlySavings)} monthly</td></tr><tr><th>Year 2 payment / savings</th><td>${money(scenario.year2Payment)} / ${money(scenario.year2MonthlySavings)} monthly</td></tr><tr><th>Seller-paid interest subsidy</th><td>${money(scenario.totalSubsidy)}</td></tr>` : `<tr><td>This buyer did not run a 2-1 Buydown scenario yet.</td></tr>`;
    const waitingRows = cowScenario ? `<tr><th>Waiting period</th><td>${cowScenario.waitYears} year${cowScenario.waitYears === 1 ? "" : "s"}</td></tr><tr><th>Monthly rent</th><td>${money(cowScenario.monthlyRent)}</td></tr><tr><th>Rent paid while waiting</th><td>${money(cowScenario.totalRentPaid)}</td></tr><tr><th>Equity if buying now</th><td>${money(cowScenario.equityGained)}</td></tr><tr><th>Estimated cost of waiting</th><td>${money(cowScenario.costOfWaiting)}</td></tr>` : `<tr><td>This buyer did not run a Cost of Waiting scenario yet.</td></tr>`;
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Buyer calculation summary — ${escapeHtml(propertyAddress)}</title><style>body{font-family:Arial,sans-serif;color:#1d3128;margin:42px;line-height:1.45}h1{font-family:Georgia,serif;font-size:28px;margin:0 0 4px}h2{font-family:Georgia,serif;margin:28px 0 10px;color:#153f30}.tag{display:inline-block;background:#e8b442;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:700}.note{color:#56645e;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #d8dfdb;padding:9px;text-align:left;font-size:14px}th{width:48%;color:#50645a}.disclaimer{margin-top:30px;border-top:1px solid #d8dfdb;padding-top:14px;font-size:10px;color:#56645e}@media print{body{margin:0}}</style></head><body><div class="tag">Buyer calculation summary</div><h1>${escapeHtml(propertyAddress)}</h1><p class="note">Saved property page · ${escapeHtml(programScreening)}</p><h2>2-1 Buydown scenario</h2><table>${buydownRows}</table><h2>Cost of Waiting scenario</h2><table>${waitingRows}</table><p class="disclaimer">Educational estimates only—not a loan offer, rate quote, approval, or eligibility determination. Saved property details, program screens, price, availability, and underwriting requirements require current verification.</p><p class="note">Property page: ${escapeHtml(propertyUrl)}</p><script>window.onload=()=>window.print();<\/script></body></html>`);
    printWindow.document.close();
  };
  return <Button size="sm" variant="outline" onClick={printCalculationPdf}><Printer className="mr-1.5 h-4 w-4" />Buyer calculation PDF</Button>;
}

export default function PropertyLandingPage() {
  const [, params] = useRoute("/property/:slug");
  const slug = params?.slug?.toLowerCase() ?? "";
  const { data, isLoading } = trpc.propertyPages.getPublic.useQuery({ slug }, { enabled: Boolean(slug) });
  const snapshot = useMemo(() => data?.page ? parsePropertyLandingSnapshot(data.page.listingSnapshot) : null, [data?.page?.listingSnapshot]);
  const track = trpc.propertyPages.trackActivity.useMutation();

  if (isLoading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading saved property details…</div>;
  if (!data?.page || !snapshot) return <div className="min-h-screen grid place-items-center px-6 text-center"><div><h1 className="font-display text-3xl font-semibold">Property page unavailable</h1><p className="mt-3 text-muted-foreground">This saved property page may have been retired or its snapshot is unavailable.</p></div></div>;

  const officer = data.loanOfficer;
  const agent = data.agent;
  const propertyUrl = `https://firsttimehomebuyer.manus.space/property/${data.page.slug}`;
  const eligibility = propertyEligibilityLabel(snapshot);
  const heroMedia = getPropertyHeroMedia(snapshot);
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
            <PropertySectionNavigator />
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
                  </div>
                  <div className="property-print-hide mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => { track.mutate({ slug: data.page.slug, eventType: "print_export" }); window.print(); }}><Printer className="mr-1.5 h-4 w-4" />Print / save PDF</Button>
                    <BuyerCalculationPdfButton propertyAddress={snapshot.address} propertyUrl={propertyUrl} isLmi={snapshot.isLmi} isUsda={snapshot.isUsda} />
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

            <section id="property-details" className="scroll-mt-24 py-12 md:py-16">
              <div className="container grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
                  <div className="flex items-center gap-2"><SquareStack className="h-5 w-5 text-primary" /><h2 className="font-display text-2xl font-semibold">Saved property details</h2></div>
                  <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    <div><dt className="text-sm text-muted-foreground">Saved snapshot price</dt><dd className="mt-1 text-xl font-semibold">{money(snapshot.price)}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Screening context</dt><dd className="mt-1 font-semibold">{eligibility}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">MLS reference</dt><dd className="mt-1 font-medium">{[snapshot.mlsName, snapshot.mlsNumber].filter(Boolean).join(" · ") || "Not in saved snapshot"}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Units</dt><dd className="mt-1 font-medium">{snapshot.units ?? "Not in saved snapshot"}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Property taxes</dt><dd className="mt-1 font-medium">{money(snapshot.propertyTaxes)}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Saved status</dt><dd className="mt-1 font-medium">{snapshot.status ?? "Not in saved snapshot"}</dd></div>
                  </dl>
                  {data.page.aiSummary && <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-5"><h3 className="font-semibold text-primary">Property highlights</h3><p className="mt-3 leading-relaxed text-muted-foreground">{data.page.aiSummary}</p><p className="mt-3 text-xs text-muted-foreground">Dashboard-reviewed draft based only on the saved property snapshot; verify current details independently.</p></div>}
                  {snapshot.description && <div className="mt-8 border-t border-border pt-6"><h3 className="font-semibold">Saved listing description</h3><p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{snapshot.description}</p></div>}
                  <p className="mt-8 rounded-lg bg-muted p-4 text-sm leading-relaxed text-muted-foreground">This page uses a saved GeoSphere listing snapshot, not a live MLS or listing feed. Confirm current status, price, property condition, features, and eligibility with the listing professional and the applicable program requirements before relying on any information.</p>
                </div>
                <aside className="space-y-6">
                  {snapshot.latitude !== null && snapshot.longitude !== null ? <div><div className="mb-3 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><h2 className="font-display text-2xl font-semibold">Saved map location</h2></div><SavedLocationMap latitude={snapshot.latitude} longitude={snapshot.longitude} address={snapshot.address} /><a className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" href="https://geosphere-map-oregon.vercel.app/" target="_blank" rel="noreferrer">Open the GeoSphere map <ExternalLink className="h-3.5 w-3.5" /></a></div> : null}
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm"><h2 className="font-display text-2xl font-semibold">Your local team</h2><div className="mt-5 space-y-4">{officer && <div><div className="font-semibold">{officer.name}</div><div className="text-sm text-muted-foreground">{officer.title} · NMLS #{officer.nmls}</div><div className="text-sm text-muted-foreground">{officer.companyName} · {officer.phone}</div></div>}{agent && <div className="border-t border-border pt-4"><div className="font-semibold">{agent.name}</div><div className="text-sm text-muted-foreground">{agent.companyName}</div><div className="text-sm text-muted-foreground">{agent.phone}</div></div>}</div></div>
                </aside>
              </div>
            </section>
            <div id="payment-scenarios">
              <CalculatorEligibilityBadges isLmi={snapshot.isLmi} isUsda={snapshot.isUsda} />
              <div id="buydown" className="scroll-mt-24"><Buydown purchasePrice={snapshot.price ?? undefined} /></div>
            </div>
            <section id="cost-of-waiting" className="scroll-mt-24 py-16 text-primary-foreground md:py-20" style={{ background: "oklch(0.27 0.05 162)" }}>
              <div className="container">
                <div className="property-print-hide mb-2 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-[0.13em] text-primary-foreground/65">Saved program screen</span>{snapshot.isLmi && <Badge className="bg-[oklch(0.82_0.12_80)] text-[oklch(0.22_0.04_155)] hover:bg-[oklch(0.82_0.12_80)]">OHCS Flex Lending screen</Badge>}{snapshot.isUsda && <Badge className="bg-emerald-100 text-emerald-950 hover:bg-emerald-100">USDA RD screen</Badge>}{!snapshot.isLmi && !snapshot.isUsda && <Badge variant="outline" className="border-white/25 text-primary-foreground/75">No saved Flex or USDA screen</Badge>}</div>
                <div className="max-w-3xl">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[oklch(0.82_0.12_80)]">Build a plan around this home</p>
                  <h2 className="mt-3 font-display text-3xl font-semibold leading-tight md:text-4xl">What could waiting cost you while this opportunity changes?</h2>
                  <p className="mt-4 max-w-2xl leading-relaxed text-primary-foreground/75">Use the calculator below to compare rent paid with the home equity you could build. The estimate is educational and can be saved with your Roadmap request for a conversation about this saved property.</p>
                </div>
                <CostOfWaiting purchasePrice={snapshot.price ?? undefined} propertyAddress={snapshot.address} />
              </div>
            </section>
            <div id="roadmap" className="scroll-mt-24"><LeadMagnet /></div>
          </main>
          <Footer />
          <MortgageChatWidget />
        </div>
      </ScenarioProvider>
    </AgentPageProvider>
  );
}
