export type PairingAgent = { id: number };
export type PairingOfficer = { agentId: number | null; visible: number };

/** Returns agent IDs without exactly one active loan-officer pairing. */
export function getUnpairedAgentIds(agents: PairingAgent[], officers: PairingOfficer[]) {
  const activePairCounts = new Map<number, number>();
  for (const officer of officers) {
    if (officer.visible === 1 && officer.agentId !== null) {
      activePairCounts.set(officer.agentId, (activePairCounts.get(officer.agentId) ?? 0) + 1);
    }
  }
  return agents.filter((agent) => (activePairCounts.get(agent.id) ?? 0) !== 1).map((agent) => agent.id);
}
