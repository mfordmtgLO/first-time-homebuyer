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

export type SyncedTopAgentSortRecord = SyncedTopAgentSearchRecord & { sourceRank: number | null };
export type SyncedTopAgentSort = "rank" | "office" | "name";

export function sortSyncedTopAgents<T extends SyncedTopAgentSortRecord>(profiles: T[], sort: SyncedTopAgentSort): T[] {
  return [...profiles].sort((left, right) => {
    if (sort === "rank") return (left.sourceRank ?? Number.MAX_SAFE_INTEGER) - (right.sourceRank ?? Number.MAX_SAFE_INTEGER) || left.fullName.localeCompare(right.fullName);
    if (sort === "office") return (left.brokerage ?? "").localeCompare(right.brokerage ?? "") || left.fullName.localeCompare(right.fullName);
    return left.fullName.localeCompare(right.fullName);
  });
}

export function getRankMovement(previousRank: number | null, currentRank: number | null): "improved" | "dropped" | null {
  if (previousRank === null || currentRank === null || previousRank === currentRank) return null;
  return currentRank < previousRank ? "improved" : "dropped";
}
