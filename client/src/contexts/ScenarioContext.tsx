/* Shares the visitor's latest calculator runs (2-1 buydown + cost of waiting) with the lead form. */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { BuydownScenario, CostOfWaitingScenario } from "@shared/scenario";

type ScenarioContextValue = {
  /** Latest calculator snapshot (kept in sync while the visitor plays with inputs). */
  scenario: BuydownScenario | null;
  setScenario: (s: BuydownScenario | null) => void;
  /** True once the visitor explicitly chose to attach the scenario to their Roadmap request. */
  attached: boolean;
  setAttached: (v: boolean) => void;
  /** Latest cost-of-waiting snapshot (kept in sync while the visitor plays with inputs). */
  cowScenario: CostOfWaitingScenario | null;
  setCowScenario: (s: CostOfWaitingScenario | null) => void;
  /** True once the visitor explicitly attached the cost-of-waiting scenario. */
  cowAttached: boolean;
  setCowAttached: (v: boolean) => void;
};

const ScenarioContext = createContext<ScenarioContextValue | null>(null);

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<BuydownScenario | null>(null);
  const [attached, setAttached] = useState(false);
  const [cowScenario, setCowScenario] = useState<CostOfWaitingScenario | null>(null);
  const [cowAttached, setCowAttached] = useState(false);

  const value = useMemo(
    () => ({
      scenario,
      setScenario,
      attached,
      setAttached,
      cowScenario,
      setCowScenario,
      cowAttached,
      setCowAttached,
    }),
    [scenario, attached, cowScenario, cowAttached]
  );

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>;
}

export function useScenario() {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenario must be used within ScenarioProvider");
  return ctx;
}
