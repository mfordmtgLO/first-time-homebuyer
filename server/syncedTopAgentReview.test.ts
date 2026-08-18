import { describe, expect, it } from "vitest";
import { getChangedSourceFields } from "./db";

describe("synced top-agent review change detection", () => {
  it("identifies only the source fields that changed", () => {
    const previous = JSON.stringify({ fullName: "Alex Agent", phone: "541-111-1111", brokerage: "North Realty" });
    const proposed = JSON.stringify({ fullName: "Alex Agent", phone: "541-222-2222", brokerage: "North Realty", cityArea: "Bend" });
    expect(getChangedSourceFields(previous, proposed)).toEqual(["phone", "cityArea"]);
  });

  it("returns a conservative fallback for malformed source records", () => {
    expect(getChangedSourceFields("not-json", "also-not-json")).toEqual(["source profile"]);
  });
});
