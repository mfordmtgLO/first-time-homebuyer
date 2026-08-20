import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const managerSource = readFileSync(resolve(process.cwd(), "client/src/components/EmailTemplateLifecycleManager.tsx"), "utf8");

describe("EmailTemplateLifecycleManager bulk archived lifecycle", () => {
  it("keeps usage-based sort choices and archived bulk restore/delete controls", () => {
    expect(managerSource).toContain('value="most_used"');
    expect(managerSource).toContain('value="least_used"');
    expect(managerSource).toContain("Restore selected");
    expect(managerSource).toContain("Delete selected");
    expect(managerSource).toContain("onBulkRestore");
    expect(managerSource).toContain("onBulkDelete");
  });

  it("requires a confirmation before permanently deleting multiple archived templates", () => {
    expect(managerSource).toContain("Permanently delete");
    expect(managerSource).toContain("This cannot be undone.");
  });
});
