export interface MaterializedStats {
  [key: string]: unknown;
}

export interface Achievement {
  id: string;
  type: string;
  earnedAt: string;
  [key: string]: unknown;
}

export interface RefreshStatsRequest {
  lastRefreshRequested: string;
}
