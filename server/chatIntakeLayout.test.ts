import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/components/ChatIntakeLeads.tsx"), "utf8");

describe("Mortgage chat intake dashboard layout", () => {
  it("uses a responsive filter grid instead of a fixed single-line control row", () => {
    expect(source).toContain('grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7');
    expect(source).toContain('className="w-full"');
  });

  it("keeps the planning snapshot readable through a stable column and expandable calculator detail", () => {
    expect(source).toContain('min-w-[1500px] w-full text-sm');
    expect(source).toContain('min-w-[14rem]');
    expect(source).toContain('<details className="group mt-1.5');
    expect(source).toContain('saved calculator scenario');
  });
});
