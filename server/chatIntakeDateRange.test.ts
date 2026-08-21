import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/components/ChatIntakeLeads.tsx"), "utf8");

describe("Mortgage chat intake date range", () => {
  it("filters created chat intakes between optional start and end dates", () => {
    expect(source).toContain('const [startedAfter, setStartedAfter] = useState("")');
    expect(source).toContain('const [startedBefore, setStartedBefore] = useState("")');
    expect(source).toContain('createdAt >= new Date(`${startedAfter}T00:00:00`)');
    expect(source).toContain('createdAt <= new Date(`${startedBefore}T23:59:59.999`)');
  });

  it("provides accessible date controls and clears both dates", () => {
    expect(source).toContain('aria-label="Chat intake start date"');
    expect(source).toContain('aria-label="Chat intake end date"');
    expect(source).toContain('setStartedAfter("")');
    expect(source).toContain('setStartedBefore("")');
  });
});
