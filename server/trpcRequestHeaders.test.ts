import { describe, expect, it } from "vitest";
import { COOKIE_NAME } from "@shared/const";
import { buildTrpcRequestHeaders } from "@shared/trpcRequestHeaders";

describe("tRPC request headers", () => {
  it("always requests JSON and carries the preview-session bearer token when available", () => {
    expect(buildTrpcRequestHeaders(`${COOKIE_NAME}=preview-token; Path=/`)).toEqual({
      Accept: "application/json",
      Authorization: "Bearer preview-token",
    });
  });

  it("still requests JSON when the session fallback is unavailable", () => {
    expect(buildTrpcRequestHeaders(null)).toEqual({ Accept: "application/json" });
  });
});
