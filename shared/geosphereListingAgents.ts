export type ImportedListingAgent = {
  key: string;
  name: string;
  email: string;
};

export type ListingAgentSourceRow = {
  sourceData: string;
};

export function parseImportedListingAgent(sourceData: string): ImportedListingAgent | null {
  try {
    const source = JSON.parse(sourceData) as Record<string, unknown>;
    const agent = source.listingAgent as Record<string, unknown> | undefined;
    const email = typeof agent?.email === "string" ? agent.email.trim() : "";
    const name = typeof agent?.name === "string" ? agent.name.trim() : "";
    if (!name && !email) return null;
    const displayName = name || email;
    return {
      key: email ? `email:${email.toLowerCase()}` : `name:${displayName.toLowerCase()}`,
      name: displayName,
      email,
    };
  } catch {
    return null;
  }
}

export function getImportedListingAgentOptions<T extends ListingAgentSourceRow>(listings: T[]) {
  const options = new Map<string, ImportedListingAgent & { listingCount: number }>();
  listings.forEach((listing) => {
    const agent = parseImportedListingAgent(listing.sourceData);
    if (!agent) return;
    const existing = options.get(agent.key);
    options.set(agent.key, { ...agent, listingCount: (existing?.listingCount ?? 0) + 1 });
  });
  return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function filterByImportedListingAgent<T extends ListingAgentSourceRow>(listings: T[], agentKey: string) {
  if (!agentKey) return listings;
  return listings.filter((listing) => parseImportedListingAgent(listing.sourceData)?.key === agentKey);
}
