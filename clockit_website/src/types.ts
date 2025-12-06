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
