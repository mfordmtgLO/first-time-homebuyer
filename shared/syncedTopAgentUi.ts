export type SyncedTopAgentSearchRecord = {
  fullName: string;
  brokerage: string | null;
  cityArea: string | null;
  syncedAt: Date;
};

export function filterSyncedTopAgents<T extends SyncedTopAgentSearchRecord>(profiles: T[], query: string): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return profiles;
  return profiles.filter((profile) =>
    [profile.fullName, profile.brokerage ?? "", profile.cityArea ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

export function getSyncedTopAgentSummary<T extends SyncedTopAgentSearchRecord>(profiles: T[]) {
  const latestSyncedAt = profiles.reduce<Date | null>((latest, profile) => {
    if (!latest || profile.syncedAt.getTime() > latest.getTime()) return profile.syncedAt;
    return latest;
  }, null);
  return { count: profiles.length, latestSyncedAt };
}
