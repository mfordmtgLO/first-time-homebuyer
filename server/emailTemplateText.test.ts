import { describe, expect, it } from "vitest";
import { richEmailTemplateToText } from "../shared/emailTemplateText";

describe("richEmailTemplateToText", () => {
  it("retains readable text and safe hyperlink destinations for mailto drafts", () => {
    expect(richEmailTemplateToText("<p><strong>Hello</strong> <a href=\"https://example.com/home\">view property</a></p>")).toBe("Hello view property (https://example.com/home)");
  });

  it("retains list structure without exposing HTML tags", () => {
    expect(richEmailTemplateToText("<ul><li>First point</li><li>Second point</li></ul>")).toBe("• First point\n• Second point");
  });
});
