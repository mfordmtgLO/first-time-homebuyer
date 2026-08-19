export function getPropertyStreetAddress(address: string): string {
  const [street] = address.split(",");
  return street?.trim() || address.trim();
}

export function formatPropertyPairingSummary(
  loanOfficerName: string | null | undefined,
  agentName: string | null | undefined,
): string {
  return `${loanOfficerName || "LO not linked"} · ${agentName || "Agent not linked"}`;
}
