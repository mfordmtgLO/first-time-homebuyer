import { useEffect, useRef, useState } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { useAgentSlug, useLoanOfficerSlug } from "@/contexts/AgentPageContext";
import { trpc } from "@/lib/trpc";
import { CALENDLY_BOOKING_URL } from "@/lib/booking";
import { getNextQuestionFocusTarget } from "@shared/chatFocus";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, MessageCircle, Minus, RotateCcw, ShieldCheck, X } from "lucide-react";

const SESSION_STORAGE_KEY = "mortgage-intake-session";
const MONEY_FORMATTER = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const QUICK_REPLIES: Record<string, string[]> = {
  loan_purpose: ["Purchase", "Refinance"],
  property_type: ["Single-Family", "Condo", "Multi-Family", "Townhouse", "Manufactured home (no leased land/space rent)"],
  credit_range: ["Excellent 720+", "Good 660-719", "Fair 620-659", "Poor under 620"],
  home_search_interest: ["YES", "NO"],
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

export default function MortgageChatWidget() {
  const agentSlug = useAgentSlug();
  const loanOfficerSlug = useLoanOfficerSlug();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [officer, setOfficer] = useState<Officer | null>(null);
  const [agent, setAgent] = useState<Agent>(null);
  const [complete, setComplete] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const [guidedAmount, setGuidedAmount] = useState(0);
  const startedRef = useRef(false);
  const guidedControlsRef = useRef<HTMLDivElement>(null);

  const start = trpc.chat.start.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages(data.messages as Message[]);
      setCurrentStep(data.currentStep);
      setOfficer(data.officer);
      setAgent(data.agent ?? null);
      setComplete(data.status === "qualified");
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
      if (data.completed) setCompletionMessage(data.message);
    },
    onError: (error) => {
      toast.error(error.message || "We couldn't save that answer. Please try again.");
      setMessages((current) => current.slice(0, -1));
    },
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
    start.mutate({ sessionId: savedSession, agentSlug: agentSlug ?? undefined, loanOfficerSlug: loanOfficerSlug ?? undefined });
  }, [open, agentSlug, loanOfficerSlug, start]);

  useEffect(() => {
    const config = currentStep ? MONEY_SLIDER_CONFIG[currentStep] : undefined;
    if (config) setGuidedAmount(config.defaultValue);
  }, [currentStep]);

  const sendMessage = (content: string) => {
    if (!sessionId || answer.isPending || complete) return;
    setMessages((current) => [...current, { role: "user", content }]);
    answer.mutate({ sessionId, message: content });
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
    start.mutate({ agentSlug: agentSlug ?? undefined, loanOfficerSlug: loanOfficerSlug ?? undefined });
  };

  const quickReplies = currentStep ? QUICK_REPLIES[currentStep] ?? [] : [];
  const moneySlider = currentStep ? MONEY_SLIDER_CONFIG[currentStep] : undefined;
  const isProcessing = start.isPending || answer.isPending;
  const nextQuestionFocusTarget = getNextQuestionFocusTarget(currentStep);
  const displayStep = currentStep;
  const displayMessages = messages;
  const displayQuickReplies = displayStep ? QUICK_REPLIES[displayStep] ?? [] : [];

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
            {displayStep === "loan_purpose" ? "Choose a starting point:" : displayStep === "home_search_interest" ? "Choose YES or NO:" : displayStep === "search_area_type" ? "Choose a search area:" : "Choose the best match:"}
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
          className="fixed bottom-[5.5rem] right-3 z-50 flex h-[min(680px,calc(100dvh-7rem))] w-[calc(100vw-1.5rem)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xl sm:bottom-24 sm:right-6"
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
            <div className="flex flex-1 flex-col items-center justify-center p-7 text-center">
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
              <Button variant="outline" className="mt-3 gap-2" onClick={restart}>
                <RotateCcw className="h-4 w-4" /> Start a new intake
              </Button>
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

      <button
        type="button"
        onClick={() => {
          if (!open) { setOpen(true); setMinimized(false); return; }
          if (minimized) { setMinimized(false); return; }
          setMinimized(true);
        }}
        className="btn-press fixed bottom-5 right-5 z-50 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-xl transition hover:brightness-110 sm:right-6"
        aria-expanded={open && !minimized}
        aria-label={!open ? "Open mortgage intake chat" : minimized ? "Resume mortgage intake chat" : "Minimize mortgage intake chat"}
      >
        {open && !minimized ? <Minus className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open ? "Ask about buying" : minimized ? "Resume chat" : "Minimize"}
      </button>
    </>
  );
}
