import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const appSource = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");
const gateSource = readFileSync(resolve(projectRoot, "client/src/components/PublicSiteAccessGate.tsx"), "utf8");
const inviteManagerSource = readFileSync(resolve(projectRoot, "client/src/components/PublicSiteInviteManager.tsx"), "utf8");
const routerSource = readFileSync(resolve(projectRoot, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(projectRoot, "server/db.ts"), "utf8");
const schemaSource = readFileSync(resolve(projectRoot, "drizzle/schema.ts"), "utf8");

describe("private public-site access", () => {
  it("guards every public website route while preserving the dashboard routes", () => {
    expect(appSource).toContain('import PublicSiteAccessGate from "./components/PublicSiteAccessGate"');
    expect(appSource).toContain('<Route path={"/"} component={PrivateHome} />');
    expect(appSource).toContain('<Route path={"/loan-officer/:loanOfficerSlug"} component={PrivateLoanOfficerHome} />');
    expect(appSource).toContain('<Route path={"/with/:loanOfficerSlug/:agentSlug"} component={PrivateAgentHome} />');
    expect(appSource).toContain('<Route path={"/property/:slug"} component={PrivatePropertyLandingPage} />');
    expect(appSource).toContain('<Route path={"/leads"} component={Leads} />');
    expect(appSource).toContain('<Route path={"/admin/leads"} component={Leads} />');
  });

  it("covers signed-out, pending, accepted, revoked, and expired access states", () => {
    expect(gateSource).toContain("Private development site");
    expect(gateSource).toContain("Sign in with Manus");
    expect(gateSource).toContain('access?.access === "pending"');
    expect(gateSource).toContain('access?.access === "accepted"');
    expect(gateSource).toContain('access?.access === "revoked"');
    expect(gateSource).toContain('access?.access === "expired"');
    expect(gateSource).toContain("Accept invitation");
  });

  it("keeps invitation management admin-only and exposes the raw token only once", () => {
    expect(inviteManagerSource).toContain("publicSiteAccess.createInvite");
    expect(inviteManagerSource).toContain("publicSiteAccess.listInvites");
    expect(inviteManagerSource).toContain("publicSiteAccess.revokeInvite");
    expect(inviteManagerSource).toContain("New private website invitation link");
    expect(inviteManagerSource).toContain("Copy link");
  });

  it("defines protected status, acceptance, creation, listing, and revocation procedures", () => {
    expect(routerSource).toContain("publicSiteAccess: router({");
    expect(routerSource).toContain("status: protectedProcedure");
    expect(routerSource).toContain("accept: protectedProcedure");
    expect(routerSource).toContain("createInvite: protectedProcedure");
    expect(routerSource).toContain("listInvites: protectedProcedure");
    expect(routerSource).toContain("revokeInvite: protectedProcedure");
    expect(routerSource).toContain('createHash("sha256")');
    expect(routerSource).toContain("randomBytes(32)");
  });

  it("persists only invitation hashes and never stores raw invitation tokens", () => {
    expect(schemaSource).toContain("publicSiteInvite");
    expect(schemaSource).toContain("tokenHash: varchar");
    expect(dbSource).toContain("createPublicSiteInvite");
    expect(dbSource).toContain("tokenHash: input.tokenHash");
    expect(dbSource).not.toContain("token: input.token");
  });
});
