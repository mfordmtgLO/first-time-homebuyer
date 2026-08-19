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

export type SyncedTopAgentPoolRecord = { profileData: string };

/** Returns the highest declared source ranking pool total across the private snapshot. */
export function getSourcePoolTotal<T extends SyncedTopAgentPoolRecord>(profiles: T[]): number | null {
  const totals = profiles.flatMap((profile) => {
    try {
      const data = JSON.parse(profile.profileData) as { rankTotal?: unknown };
      return typeof data.rankTotal === "number" && Number.isFinite(data.rankTotal) && data.rankTotal > 0
        ? [data.rankTotal]
        : [];
    } catch {
      return [];
    }
  });
  return totals.length ? Math.max(...totals) : null;
}

export function formatRankMovement(fromRank: number, toRank: number, rankTotal: number | null): string {
  const direction = toRank < fromRank ? "improved" : "dropped";
  const denominator = rankTotal ? `/${rankTotal}` : "";
  return `${direction}: ${fromRank}${denominator} → ${toRank}${denominator}`;
}

export type RankHistoryRange = "7d" | "30d" | "90d" | "all";
export type RankSnapshotRecord = { capturedAt: Date };

export function filterRankSnapshots<T extends RankSnapshotRecord>(snapshots: T[], range: RankHistoryRange, now = new Date()): T[] {
  if (range === "all") return snapshots;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return snapshots.filter((snapshot) => new Date(snapshot.capturedAt).getTime() >= cutoff);
}

export type RankMovementRecord = {
  fullName: string;
  brokerage: string | null;
  fromRank: number;
  toRank: number;
  rankTotal: number | null;
};

export function summarizeOfficeRankMovements(movements: RankMovementRecord[]) {
  const byOffice = new Map<string, { office: string; improved: number; dropped: number; netPositions: number }>();
  for (const movement of movements) {
    const office = movement.brokerage?.trim() || "Office not supplied";
    const summary = byOffice.get(office) ?? { office, improved: 0, dropped: 0, netPositions: 0 };
    const change = movement.fromRank - movement.toRank;
    if (change > 0) summary.improved += 1;
    if (change < 0) summary.dropped += 1;
    summary.netPositions += change;
    byOffice.set(office, summary);
  }
  return Array.from(byOffice.values()).sort((left, right) => right.netPositions - left.netPositions || left.office.localeCompare(right.office));
}
