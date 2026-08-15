import { describe, expect, it } from "vitest";
import { filterPropertyListRecipients, formatRecipientLastFirst } from "../shared/geosphereRecipients";

const recipients = [
  { value: "roadmap:1", name: "Michael Ford", email: "michael@example.com", source: "Roadmap" as const },
  { value: "chat:2", name: "Jane Adams", email: "jane@example.com", source: "Chat Intake" as const },
  { value: "roadmap:3", name: "Chris Baker", email: "chris@example.com", source: "Roadmap" as const },
];

describe("GeoSphere property-list recipients", () => {
  it("formats recipients as Last, First", () => {
    expect(formatRecipientLastFirst("Michael Ford")).toBe("Ford, Michael");
  });

  it("filters by source and sorts by last name", () => {
    expect(filterPropertyListRecipients(recipients, "", "all").map((recipient) => recipient.name)).toEqual(["Jane Adams", "Chris Baker", "Michael Ford"]);
    expect(filterPropertyListRecipients(recipients, "ba", "roadmap").map((recipient) => recipient.name)).toEqual(["Chris Baker"]);
    expect(filterPropertyListRecipients(recipients, "", "chat").map((recipient) => recipient.name)).toEqual(["Jane Adams"]);
  });
});
