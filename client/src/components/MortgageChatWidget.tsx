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
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { ArrowRight, BookOpen, Calculator, CalendarDays, CheckCircle2, ChevronDown, Clock3, Home, MessageCircle, Minus, RotateCcw, ShieldCheck, X } from "lucide-react";
import { emitFunnelConversion, getCampaignAttribution } from "@/lib/campaignTracking";

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
      setComplete(data.completed);
      if (data.completed) {
        setCompletionMessage(data.message);
        setBuyerAgentEligible(data.buyerAgentEligible === true);
        emitFunnelConversion("chat_intake_complete");
        if (data.homesListRequested) emitFunnelConversion("homes_list_request");
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
          className="fixed inset-x-3 top-32 bottom-[5.5rem] z-50 flex w-auto max-w-[420px] flex-col overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xl sm:inset-x-auto sm:top-32 sm:right-6 sm:bottom-24 sm:w-[420px]"
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
                className="rounded-md p-1 text-primary-foreground/75 transition hover:bg-white/10 hover:text-primary-foreground"
                aria-label="Minimize mortgage intake chat"
              >
                <Minus className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setMinimized(false); }}
                className="rounded-md p-1 text-primary-foreground/75 transition hover:bg-white/10 hover:text-primary-foreground"
                aria-label="Close mortgage intake chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          {complete ? (
            <div ref={completionContentRef} className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain p-5 pb-14 text-center sm:justify-start sm:px-7 sm:pb-7 sm:pt-8">
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
                        className="h-10 min-w-0 justify-start gap-1.5 px-2 text-left text-xs"
                        onClick={() => continueToSiteSection(option.targetId)}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{option.label}</span>
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
          className={`btn-press fixed bottom-[5.5rem] right-5 z-50 inline-flex h-14 items-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-xl transition-[width,padding,opacity,transform,filter] duration-200 hover:brightness-110 sm:bottom-24 sm:right-6 ${launcherSizing} ${hideCollapsedLauncherDuringHero ? "max-md:pointer-events-none max-md:translate-y-4 max-md:opacity-0" : ""}`}
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
