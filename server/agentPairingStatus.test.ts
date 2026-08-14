import { describe, expect, it } from "vitest";
import { getUnpairedAgentIds } from "../shared/agentPairingStatus";

describe("agent pairing status", () => {
  it("warns for agents with no active pairing or an ambiguous multi-officer pairing", () => {
    expect(getUnpairedAgentIds(
      [{ id: 1 }, { id: 2 }, { id: 3 }],
      [
        { agentId: 1, visible: 1 },
        { agentId: 2, visible: 0 },
        { agentId: 3, visible: 1 },
        { agentId: 3, visible: 1 },
      ]
    )).toEqual([2, 3]);
  });
});
