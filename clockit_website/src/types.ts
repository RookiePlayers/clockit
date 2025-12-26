export type Range = "week" | "month" | "year" | "all";

export type MetricStats = {
  sum: number;
  avg: number;
  min: number;
  max: number;
};

export type MetricValue = number | MetricStats;

export type AggregateEntry = {
  periodStart: string;
  totalSeconds: MetricValue;
  workingSeconds: MetricValue;
  idleSeconds: MetricValue;
  sessionCount?: MetricValue;
  productivityScore?: number;
  productivityPercent: number;
  languageSeconds?: Record<string, MetricValue>;
  topLanguage?: { language: string; seconds: MetricValue } | null;
  workspaceSeconds?: Record<string, MetricValue>;
  topWorkspaces?: { workspace: string; seconds: MetricValue }[];
};

export type Aggregates = Partial<Record<Range, AggregateEntry[]>>;

export type Grade = { letter: string; description: string };

export const rangeLabels: Record<Range, string> = {
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
  all: "All time",
};

export type ChartView = "stackedArea" | "stackedBar" | "line";

export const chartViews: Array<{ key: ChartView; label: string }> = [
  { key: "stackedArea", label: "Stacked area" },
  { key: "stackedBar", label: "Stacked bars" },
  { key: "line", label: "Lines" },
];

export type Goal = {
  id: string;
  title: string;
  createdAt: string;
  completed: boolean;
  completedAt?: string;
  groupId: string;
  groupName: string;
  createdBy?: string;
  locked?: boolean;
  estimatedGoalTime?: number;
  order?: number;
  note?: string;
};

export type GoalGroup = {
  id: string;
  name: string;
  kind: "day" | "custom";
  createdAt?: string;
  description?: string;
};

export type ClockitSession = {
  id: string;
  label: string;
  startedAt: number;
  endedAt?: number;
  running: boolean;
  accumulatedMs?: number;
  pausedAt?: number;
  goals: Goal[];
  groupId?: string;
  groupName?: string;
  comment?: string;
  perLanguageSeconds?: Record<string, number>;
  perFileSeconds?: Record<string, number>;
  idleSeconds?: number;
  linesAdded?: number;
  linesDeleted?: number;
};

export type ClockitSessionUpload = Omit<ClockitSession, "groupId" | "groupName" | "comment" | "pausedAt"> & {
  userName?: string;
  userEmail?: string;
  csv?: string | null;
  csvHeader?: string;
  groupId: string | null;
  groupName: string | null;
  comment: string | null;
  pausedAt: number | null;
  sessionId: string;
  createdAt: string;
  lastUpdatedAt?: string;
}