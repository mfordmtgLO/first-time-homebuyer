import { useEffect, useRef, useState } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { useAgentSlug, useLoanOfficerSlug, usePropertyPageSlug } from "@/contexts/AgentPageContext";
import { useScenario } from "@/contexts/ScenarioContext";
import { trpc } from "@/lib/trpc";
import { CALENDLY_BOOKING_URL } from "@/lib/booking";
import { getNextQuestionFocusTarget, hasTranscriptContentBelow } from "@shared/chatFocus";
import {
  chatCompletionNavigation,
  FULL_FIRST_TIME_HOMEBUYER_URL,
  propertyChatCompletionNavigation,
  type ChatCompletionNavigationTarget,
  type PropertyChatCompletionNavigationTarget,
} from "@shared/chatCompletionNavigation";
import { shouldHideMobileChatLauncher } from "@shared/chatLauncherVisibility";
import { getMobileChatLauncherPresentation } from "@shared/chatLauncherPresentation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { ArrowRight, BookOpen, Calculator, CalendarDays, CheckCircle2, ChevronDown, Clock3, Download, Home, MessageCircle, Minus, RotateCcw, ShieldCheck, X } from "lucide-react";
import { emitFunnelConversion, getCampaignAttribution } from "@/lib/campaignTracking";
import { getCaptureDevice } from "@/lib/captureDevice";
import { jsPDF } from "jspdf";

const SESSION_STORAGE_KEY = "mortgage-intake-session";
const MONEY_FORMATTER = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const QUICK_REPLIES: Record<string, string[]> = {
  loan_purpose: ["Purchase", "Refinance"],
  property_type: ["Single-Family", "Condo", "Multi-Family", "Townhouse", "Manufactured home (no leased land/space rent)"],
  credit_range: ["Excellent 720+", "Good 660-719", "Fair 620-659", "Poor under 620"],
  home_search_interest: ["YES", "NO"],
  sms_consent: ["Yes", "No"],
  search_area_type: ["City", "County"],
};

const MONEY_SLIDER_CONFIG: Record<string, { label: string; max: number; step: number; defaultValue: number }> = {
  property_value: { label: "Estimated purchase price", max: 1_000_000, step: 25_000, defaultValue: 350_000 },
  annual_income: { label: "Estimated gross annual household income", max: 1_000_000, step: 10_000, defaultValue: 80_000 },
  down_payment: { label: "Available down payment", max: 500_000, step: 5_000, defaultValue: 0 },
};

const CHAT_FLOW_STEPS = ["loan_purpose", "property_type", "property_value", "credit_range", "annual_income", "financing_amount", "full_name", "email", "phone", "sms_consent", "home_search_interest", "search_area_type", "target_area"] as const;

function stripChatFormatting(value: string) {
  return value.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

// Direct email delivery is intentionally inactive until an approved Resend API
// key and verified sender domain are configured. Do not replace this with a
// mailto link: delivering an attachment must remain an explicit, server-side,
// recipient-confirmed action.
function downloadMortgageIntakeSummary(messages: Message[], officer: Officer | null, completionMessage: string) {
  const document = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 56;
  const addWrapped = (text: string, fontSize: number, color: [number, number, number], gapAfter = 10) => {
    document.setFontSize(fontSize);
    document.setTextColor(...color);
    const lines = document.splitTextToSize(text, contentWidth) as string[];
    if (cursorY + lines.length * (fontSize + 4) > pageHeight - margin) {
      document.addPage();
      cursorY = margin;
    }
    document.text(lines, margin, cursorY);
    cursorY += lines.length * (fontSize + 4) + gapAfter;
  };
  document.setFillColor(9, 71, 52);
  document.rect(0, 0, pageWidth, 28, "F");
  addWrapped("Your Mortgage Intake Summary", 21, [9, 71, 52], 6);
  addWrapped("For your personal reference — informational intake only; not a loan approval, commitment, or quote.", 9, [89, 89, 89], 18);
  if (officer) {
    addWrapped(`${officer.name}${officer.title ? ` · ${officer.title}` : ""}${officer.nmls ? ` · NMLS #${officer.nmls}` : ""}`, 11, [34, 34, 34], 2);
    addWrapped([officer.phone, officer.email].filter(Boolean).join(" · "), 9, [89, 89, 89], 16);
  }
  addWrapped("Your submitted responses", 13, [9, 71, 52], 10);
  let latestQuestion = "";
  messages.filter((message) => message.role !== "system").forEach((message) => {
    if (message.role === "assistant") {
      latestQuestion = stripChatFormatting(message.content);
      return;
    }
    addWrapped(latestQuestion || "Your response", 10, [49, 49, 49], 3);
    addWrapped(stripChatFormatting(message.content), 11, [0, 0, 0], 13);
  });
  if (completionMessage) {
    addWrapped("Next steps", 13, [9, 71, 52], 6);
    addWrapped(stripChatFormatting(completionMessage), 10, [49, 49, 49], 10);
  }
  addWrapped(`Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, 8, [115, 115, 115], 0);
  document.save(`mortgage-intake-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
}

type Officer = {
  name: string;
  email: string;
  phone: string;
  nmls: string;
  title: string;
};

type Agent = { name: string; companyName: string; phone: string; email: string } | null;

export default function MortgageChatWidget({ compactWhenIdle = false }: { compactWhenIdle?: boolean }) {
  const agentSlug = useAgentSlug();
  const loanOfficerSlug = useLoanOfficerSlug();
  const propertyPageSlug = usePropertyPageSlug();
  const { scenario, cowScenario } = useScenario();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [officer, setOfficer] = useState<Officer | null>(null);
  const [agent, setAgent] = useState<Agent>(null);
  const [complete, setComplete] = useState(false);
  const [isCompletingTransition, setIsCompletingTransition] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const [buyerAgentEligible, setBuyerAgentEligible] = useState(false);
  const [buyerAgentRequested, setBuyerAgentRequested] = useState(false);
  const [guidedAmount, setGuidedAmount] = useState(0);
  const [heroActionsVisible, setHeroActionsVisible] = useState(true);
  const [pageRecentlyScrolled, setPageRecentlyScrolled] = useState(false);
  const [hasCompletionContentBelow, setHasCompletionContentBelow] = useState(false);
  const startedRef = useRef(false);
  const guidedControlsRef = useRef<HTMLDivElement>(null);
  const completionContentRef = useRef<HTMLDivElement>(null);
  const launcherCollapseTimerRef = useRef<number | null>(null);
  const completionTransitionTimerRef = useRef<number | null>(null);

  const start = trpc.chat.start.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages(data.messages as Message[]);
      setCurrentStep(data.currentStep);
      setOfficer(data.officer);
      setAgent(data.agent ?? null);
      setComplete(data.status === "qualified");
      setBuyerAgentEligible(data.status === "qualified" && data.buyerAgentEligible === true);
      setBuyerAgentRequested(data.buyerAgentRequested === true);
      setCompletionMessage(
        data.status === "qualified"
          ? data.messages.at(-1)?.content ?? "Your intake profile is complete."
          : ""
      );
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
      } catch {
        // Session will continue for this page load even if browser storage is unavailable.
      }
    },
    onError: (error) => toast.error(error.message || "We couldn't start the intake chat. Please try again."),
  });

  const answer = trpc.chat.answer.useMutation({
    onSuccess: (data) => {
      setMessages((current) => [...current, { role: "assistant", content: data.message }]);
      setCurrentStep(data.currentStep);
      if (data.completed) {
        setCompletionMessage(data.message);
        setBuyerAgentEligible(data.buyerAgentEligible === true);
        setIsCompletingTransition(true);
        if (completionTransitionTimerRef.current) window.clearTimeout(completionTransitionTimerRef.current);
        completionTransitionTimerRef.current = window.setTimeout(() => {
          setComplete(true);
          setIsCompletingTransition(false);
          completionTransitionTimerRef.current = null;
        }, 360);
        emitFunnelConversion("chat_intake_complete");
        if (data.homesListRequested) emitFunnelConversion("homes_list_request");
      } else {
        setComplete(false);
      }
    },
    onError: (error) => {
      toast.error(error.message || "We couldn't save that answer. Please try again.");
      setMessages((current) => current.slice(0, -1));
    },
  });

  const requestBuyerAgent = trpc.chat.requestBuyerAgent.useMutation({
    onSuccess: (data) => {
      setBuyerAgentRequested(true);
      emitFunnelConversion("buyer_agent_connection_request");
      toast.success(data.alreadyRequested ? "Your buyer-agent connection request is already saved." : "Your buyer-agent connection request has been sent.");
    },
    onError: (error) => toast.error(error.message || "We couldn't save your buyer-agent connection request."),
  });

  useEffect(() => {
    if (!open || startedRef.current) return;
    startedRef.current = true;
    let savedSession: string | undefined;
    try {
      savedSession = localStorage.getItem(SESSION_STORAGE_KEY) ?? undefined;
    } catch {
      // Storage is optional; a fresh session is safe.
    }
    start.mutate({
      sessionId: savedSession,
      agentSlug: agentSlug ?? undefined,
      loanOfficerSlug: loanOfficerSlug ?? undefined,
      propertyPageSlug: propertyPageSlug ?? undefined,
      scenario: scenario || cowScenario ? { buydown: scenario ?? undefined, costOfWaiting: cowScenario ?? undefined } : undefined,
      campaignAttribution: getCampaignAttribution(),
      captureDevice: getCaptureDevice(),
    });
  }, [open, agentSlug, loanOfficerSlug, propertyPageSlug, start]);

  useEffect(() => {
    const openMortgageChat = () => {
      setOpen(true);
      setMinimized(false);
    };
    window.addEventListener("open-mortgage-chat", openMortgageChat);
    return () => window.removeEventListener("open-mortgage-chat", openMortgageChat);
  }, []);

  useEffect(() => () => {
    if (completionTransitionTimerRef.current) window.clearTimeout(completionTransitionTimerRef.current);
  }, []);

  useEffect(() => {
    const heroActions = document.getElementById("hero-primary-actions");
    if (!heroActions || !("IntersectionObserver" in window)) {
      setHeroActionsVisible(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setHeroActionsVisible(entry?.isIntersecting === true),
      { threshold: 0.45 },
    );
    observer.observe(heroActions);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const revealLauncherOnScroll = () => {
      setPageRecentlyScrolled(true);
      if (launcherCollapseTimerRef.current) window.clearTimeout(launcherCollapseTimerRef.current);
      launcherCollapseTimerRef.current = window.setTimeout(() => {
        setPageRecentlyScrolled(false);
        launcherCollapseTimerRef.current = null;
      }, 1400);
    };
    window.addEventListener("scroll", revealLauncherOnScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", revealLauncherOnScroll);
      if (launcherCollapseTimerRef.current) window.clearTimeout(launcherCollapseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!complete) {
      setHasCompletionContentBelow(false);
      return;
    }
    const completionContent = completionContentRef.current;
    if (!completionContent) return;
    const updateCompletionOverflow = () => {
      setHasCompletionContentBelow(
        hasTranscriptContentBelow(
          completionContent.scrollTop,
          completionContent.clientHeight,
          completionContent.scrollHeight,
        ),
      );
    };
    const frame = requestAnimationFrame(() => {
      // The transcript and completion views reuse this scrolling container on desktop.
      // Reset the previous chat-step offset so the completion message starts below the header.
      completionContent.scrollTop = 0;
      updateCompletionOverflow();
    });
    completionContent.addEventListener("scroll", updateCompletionOverflow, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      completionContent.removeEventListener("scroll", updateCompletionOverflow);
    };
  }, [complete, completionMessage, buyerAgentEligible, buyerAgentRequested]);

  useEffect(() => {
    const config = currentStep ? MONEY_SLIDER_CONFIG[currentStep] : undefined;
    if (config) setGuidedAmount(config.defaultValue);
  }, [currentStep]);

  const sendMessage = (content: string) => {
    if (!sessionId || answer.isPending || complete) return;
    setMessages((current) => [...current, { role: "user", content }]);
    answer.mutate({ sessionId, message: content });
  };

  const completionNavigation = propertyPageSlug ? propertyChatCompletionNavigation : chatCompletionNavigation;

  const continueToSiteSection = (targetId: ChatCompletionNavigationTarget | PropertyChatCompletionNavigationTarget) => {
    if (targetId === "full-homebuyer-site") {
      window.location.assign(FULL_FIRST_TIME_HOMEBUYER_URL);
      return;
    }
    setOpen(false);
    setMinimized(false);
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const restart = () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // A fresh in-memory session still works.
    }
    startedRef.current = true;
    setSessionId(null);
    setMessages([]);
    setCurrentStep(null);
    setOfficer(null);
    setAgent(null);
    setComplete(false);
    setIsCompletingTransition(false);
    setCompletionMessage("");
    setGuidedAmount(0);
    setBuyerAgentEligible(false);
    setBuyerAgentRequested(false);
    start.mutate({
      agentSlug: agentSlug ?? undefined,
      loanOfficerSlug: loanOfficerSlug ?? undefined,
      propertyPageSlug: propertyPageSlug ?? undefined,
      scenario: scenario || cowScenario ? { buydown: scenario ?? undefined, costOfWaiting: cowScenario ?? undefined } : undefined,
      campaignAttribution: getCampaignAttribution(),
      captureDevice: getCaptureDevice(),
    });
  };

  const quickReplies = currentStep ? QUICK_REPLIES[currentStep] ?? [] : [];
  const moneySlider = currentStep ? MONEY_SLIDER_CONFIG[currentStep] : undefined;
  const isProcessing = start.isPending || answer.isPending;
  const nextQuestionFocusTarget = getNextQuestionFocusTarget(currentStep);
  const displayStep = currentStep;
  const displayMessages = messages;
  const displayQuickReplies = displayStep ? QUICK_REPLIES[displayStep] ?? [] : [];
  const hideCollapsedLauncherDuringHero = shouldHideMobileChatLauncher(heroActionsVisible, open);
  const launcherPresentation = getMobileChatLauncherPresentation(open, pageRecentlyScrolled);
  const launcherIsExpanded = !compactWhenIdle || launcherPresentation === "expanded";
  const launcherSizing = compactWhenIdle
    ? launcherIsExpanded ? "w-auto px-5" : "w-14 justify-center px-0"
    : launcherIsExpanded ? "max-md:w-auto max-md:px-5" : "max-md:w-14 max-md:justify-center max-md:px-0";
  const launcherTextSizing = compactWhenIdle
    ? launcherIsExpanded ? "max-w-40 opacity-100" : "max-w-0 opacity-0"
    : launcherIsExpanded ? "max-md:max-w-40 max-md:opacity-100" : "max-md:max-w-0 max-md:opacity-0";
  const firstAnswer = messages.find((message) => message.role === "user")?.content.toLowerCase();
  const isPurchaseFlow = firstAnswer === "purchase";
  const activeFlowSteps = CHAT_FLOW_STEPS.filter((step) => {
    if (step === "financing_amount") return true;
    if (step === "home_search_interest" || step === "search_area_type" || step === "target_area") return isPurchaseFlow;
    return true;
  });
  const normalizedCurrentStep = currentStep === "down_payment" || currentStep === "loan_amount" ? "financing_amount" : currentStep;
  const progressIndex = normalizedCurrentStep ? activeFlowSteps.indexOf(normalizedCurrentStep as typeof activeFlowSteps[number]) : -1;
  const progressStep = complete ? activeFlowSteps.length : Math.max(1, progressIndex + 1);
  const progressValue = complete ? 100 : Math.round((progressStep / activeFlowSteps.length) * 100);
  const downloadCompletionPdf = () => {
    try {
      downloadMortgageIntakeSummary(messages, officer, completionMessage);
      toast.success("Your mortgage intake PDF is downloading.");
    } catch {
      toast.error("We couldn't prepare your intake PDF. Please try again.");
    }
  };

  useEffect(() => {
    if (isProcessing || complete || nextQuestionFocusTarget !== "guided") return;
    const frame = requestAnimationFrame(() => {
      const control = guidedControlsRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [role="slider"]'
      );
      control?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [currentStep, isProcessing, complete, nextQuestionFocusTarget]);

  const guidedResponseControls = (displayQuickReplies.length > 0 || moneySlider) && displayMessages.length > 0 ? (
    <div ref={guidedControlsRef} className="max-h-[32dvh] overflow-y-auto overscroll-contain px-4 py-3">
      {displayQuickReplies.length > 0 && (
        <>
          <span className="block text-xs font-medium text-muted-foreground">
            {displayStep === "loan_purpose" ? "Choose a starting point:" : displayStep === "home_search_interest" || displayStep === "sms_consent" ? "Choose YES or NO:" : displayStep === "search_area_type" ? "Choose a search area:" : "Choose the best match:"}
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {displayQuickReplies.map((reply, index) => (
              <Button
                key={reply}
                size="sm"
                variant={index === 0 ? "default" : "outline"}
                className="h-auto min-h-9 whitespace-normal rounded-full px-3 py-2 text-left"
                disabled={!sessionId || isProcessing}
                onClick={() => sendMessage(reply)}
              >
                {reply}
              </Button>
            ))}
          </div>
        </>
      )}
      {moneySlider && (
        <>
          <div className={displayQuickReplies.length ? "mt-3 flex items-end justify-between gap-3" : "flex items-end justify-between gap-3"}>
            <span className="text-xs font-medium text-muted-foreground">{moneySlider.label}</span>
            <span className="text-sm font-semibold text-foreground">{MONEY_FORMATTER.format(guidedAmount)}</span>
          </div>
          <Slider
            className="mt-3"
            min={0}
            max={moneySlider.max}
            step={moneySlider.step}
            value={[guidedAmount]}
            disabled={!sessionId || isProcessing}
            onValueChange={([value]) => setGuidedAmount(value ?? 0)}
            aria-label={moneySlider.label}
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>$0</span>
            <span>{MONEY_FORMATTER.format(moneySlider.max)}</span>
          </div>
          <Button
            size="sm"
            className="mt-3 w-full"
            disabled={!sessionId || isProcessing}
            onClick={() => sendMessage(String(guidedAmount))}
          >
            Use {MONEY_FORMATTER.format(guidedAmount)}
          </Button>
        </>
      )}
    </div>
  ) : undefined;

  return (
    <>
      {open && !minimized && (
        <section
          aria-label="Mortgage Intake Specialist"
          className="fixed inset-x-3 top-32 bottom-[5.5rem] z-50 flex w-auto max-w-[420px] flex-col overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xl max-md:top-[4.75rem] max-md:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] max-md:max-h-[calc(100dvh-10.25rem)] sm:inset-x-auto sm:top-32 sm:right-6 sm:bottom-24 sm:w-[420px]"
        >
          <header className="flex items-start justify-between gap-4 bg-primary px-5 py-4 text-primary-foreground">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4" /> Mortgage Intake Specialist
              </div>
              <p className="mt-1 text-xs leading-relaxed text-primary-foreground/80">
                {officer
                  ? `${officer.name}${officer.nmls ? ` · NMLS #${officer.nmls}` : ""} · ${officer.phone}`
                  : "Connecting you with a licensed mortgage specialist…"}
              </p>
              {agent?.name && (
                <p className="mt-1 text-xs leading-relaxed text-primary-foreground/80">
                  Local real estate partner: {agent.name}{agent.companyName ? ` · ${agent.companyName}` : ""}{agent.phone ? ` · ${agent.phone}` : ""}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="min-h-11 min-w-11 rounded-md p-1 text-primary-foreground/75 transition hover:bg-white/10 hover:text-primary-foreground"
                aria-label="Minimize mortgage intake chat"
              >
                <Minus className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setMinimized(false); }}
                className="min-h-11 min-w-11 rounded-md p-1 text-primary-foreground/75 transition hover:bg-white/10 hover:text-primary-foreground"
                aria-label="Close mortgage intake chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>
          {!complete && messages.length > 0 && (
            <div className="border-b border-border/70 bg-muted/35 px-5 py-2.5">
              <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">
                <span>Homebuying intake progress</span>
                <span>Step {progressStep} of {activeFlowSteps.length}</span>
              </div>
              <Progress className="mt-1.5 h-1.5" value={progressValue} aria-label={`Mortgage intake progress: step ${progressStep} of ${activeFlowSteps.length}`} />
            </div>
          )}

          {complete ? (
            <div ref={completionContentRef} className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain p-5 pb-14 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300 sm:justify-start sm:px-7 sm:pb-7 sm:pt-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-700">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold text-foreground">Intake complete</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {completionMessage || "Thank you for sharing your starting point. A licensed specialist will review the information and reach out within 24 business hours."}
              </p>
              <a href={CALENDLY_BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-press mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110">
                <CalendarDays className="h-4 w-4" /> Schedule a free 15-minute call
              </a>
              <Button type="button" variant="outline" className="mt-3 gap-2" onClick={downloadCompletionPdf}>
                <Download className="h-4 w-4" /> Download my intake summary (PDF)
              </Button>
              <div className="mt-5 w-full max-w-sm border-t border-border/70 pt-4 text-left">
                <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Keep exploring</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {completionNavigation.map((option) => {
                    const Icon = option.targetId === "buydown"
                      ? Calculator
                      : option.targetId === "cost-of-waiting"
                        ? Clock3
                        : option.targetId === "full-homebuyer-site"
                          ? Home
                          : BookOpen;
                    return (
                      <Button
                        key={option.targetId}
                        type="button"
                        variant="outline"
                        className="h-auto min-h-12 w-full min-w-0 items-center justify-start gap-1.5 px-2.5 py-2 text-left text-xs transition-colors hover:border-primary/45 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                        onClick={() => continueToSiteSection(option.targetId)}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 whitespace-normal break-words text-xs font-semibold leading-tight">{option.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary/75" aria-hidden="true" />
                      </Button>
                    );
                  })}
                </div>
              </div>
              {buyerAgentEligible && (
                <Button
                  variant="outline"
                  className="mt-3 gap-2"
                  disabled={buyerAgentRequested || requestBuyerAgent.isPending || !sessionId}
                  onClick={() => sessionId && requestBuyerAgent.mutate({ sessionId })}
                >
                  {buyerAgentRequested ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <MessageCircle className="h-4 w-4" />}
                  {buyerAgentRequested ? "Buyer-agent connection requested" : "Request a buyer-agent connection"}
                </Button>
              )}
              <Button variant="outline" className="mt-3 gap-2" onClick={restart}>
                <RotateCcw className="h-4 w-4" /> Start a new intake
              </Button>
              {hasCompletionContentBelow && (
                <button
                  type="button"
                  onClick={() => completionContentRef.current?.scrollTo({ top: completionContentRef.current.scrollHeight, behavior: "smooth" })}
                  className="btn-press sticky bottom-2 mt-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-card/95 text-primary shadow-md backdrop-blur-sm transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="More completed-chat navigation choices are below. Scroll down to continue."
                  title="More below"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ) : isCompletingTransition ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-7 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200" role="status" aria-live="polite">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary motion-safe:animate-pulse motion-reduce:animate-none">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold text-foreground">Putting together your summary</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Your responses are saved. Your downloadable intake summary is almost ready.</p>
              <div className="mt-5 h-1.5 w-44 overflow-hidden rounded-full bg-primary/15"><div className="h-full w-2/3 rounded-full bg-primary motion-safe:animate-[summarySweep_0.72s_var(--ease-out-snappy)_infinite] motion-reduce:animate-none" /></div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <p className="sr-only" aria-live="polite">
                {isProcessing
                  ? "Mortgage Intake Specialist is preparing the next question."
                  : displayStep
                    ? "Next question ready."
                    : ""}
              </p>
              <AIChatBox
                messages={displayMessages}
                onSendMessage={sendMessage}
                isLoading={isProcessing}
                typingLabel="Mortgage Intake Specialist is typing…"
                questionSnapKey={displayStep}
                focusInputOnQuestionSnap={nextQuestionFocusTarget === "text"}
                responseControls={guidedResponseControls}
                placeholder="Type your answer…"
                height="100%"
                className="min-h-0 flex-1 rounded-none border-0 shadow-none"
                emptyStateMessage="Opening your mortgage intake…"
              />
            </div>
          )}
        </section>
      )}

      {(!open || minimized) && (
        <button
          type="button"
          onClick={() => {
            if (!open) { setOpen(true); setMinimized(false); return; }
            setMinimized(false);
          }}
          className={`btn-press fixed bottom-[5.5rem] right-5 z-50 inline-flex h-14 items-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-xl transition-[width,padding,opacity,transform,filter] duration-200 max-md:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-24 sm:right-6 ${launcherSizing} ${hideCollapsedLauncherDuringHero ? "max-md:pointer-events-none max-md:translate-y-4 max-md:opacity-0" : ""}`}
          aria-expanded={open && !minimized}
          aria-label={!open ? "Open mortgage intake chat" : "Resume mortgage intake chat"}
        >
          <MessageCircle className="h-5 w-5" />
          <span className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ${launcherTextSizing}`}>
            {!open ? "Ask about buying" : "Resume chat"}
          </span>
        </button>
      )}
    </>
  );
}
