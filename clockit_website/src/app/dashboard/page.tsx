"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Link from "next/link";
import UploadCSV from "@/components/UploadCSV";
import Stats from "@/components/Stats";
import Image from "next/image";
import { IconHourglassEmpty, IconSum, IconTimeDuration0 } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import Cooldown from "@/components/Cooldown";
import NavBar from "@/components/NavBar";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type Range = "week" | "month" | "year" | "all";

type MetricStats = {
  sum: number;
  avg: number;
  min: number;
  max: number;
};

type MetricValue = number | MetricStats;

type AggregateEntry = {
  periodStart: string;
  totalSeconds: MetricValue;
  idleSeconds: MetricValue;
  workingSeconds: MetricValue;
  languageSeconds?: Record<string, MetricValue>;
  topWorkspaces?: Array<{ workspace: string; seconds: MetricValue }>;
  workspaceSeconds?: Record<string, MetricValue>;
  productivityScore?: number;
  productivityPercent: number;
  topLanguage?: { language: string; seconds: MetricValue } | null;
};

type Aggregates = Partial<Record<Range, AggregateEntry[]>>;

const rangeLabels: Record<Range, string> = {
  week: "This week",
  month: "This month",
  year: "This year",
  all: "All time",
};

export default function DashboardPage() {
  const [user, loadingUser, authError] = useAuthState(auth);
  const [range, setRange] = useState<Range>("week");
  const [focusRange, setFocusRange] = useState<Range>("week");
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (!user) {
      setAggregates(null);
      setIsLoadingStats(false);
      setLastRefresh(null);
      return;
    }
    setIsLoadingStats(true);
    setStatsError(null);

    const fetchAggregates = async () => {
      try {
        const ref = doc(db, "MaterializedStats", user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setAggregates(null);
          setStatsError("No aggregated stats found yet.");
          return;
        }
        const data = snap.data() as { aggregates?: Aggregates; lastRefreshRequested?: number; lastAggregatedAt?: any; updatedAt?: any };
        setAggregates(data.aggregates || null);
        const ts = data.lastRefreshRequested;
        if (typeof ts === "number" && Number.isFinite(ts)) {
          setLastRefresh(ts);
        }
        const aggregateTs = data.lastAggregatedAt?.toMillis?.() ? data.lastAggregatedAt.toMillis() : null;
        const updatedTs = data.updatedAt?.toMillis?.() ? data.updatedAt.toMillis() : null;
        const chosen = aggregateTs || updatedTs || ts || null;
        setLastUpdated(chosen);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load stats";
        setStatsError(msg);
      } finally {
        setIsLoadingStats(false);
      }
    };

    void fetchAggregates();
  }, [user]);

  const active = useMemo(() => {
    const list = aggregates?.[range];
    if (!list || list.length === 0) return undefined;
    const sorted = [...list].sort((a, b) => (a.periodStart > b.periodStart ? -1 : 1));
    return sorted[0];
  }, [aggregates, range]);

  const languageRadarData = useMemo(() => {
    const totals = languageTotalsForRange(aggregates, focusRange);
    return Object.entries(totals)
      .map(([language, seconds]) => ({ language, hours: Number(toHours(seconds).toFixed(2)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 12);
  }, [aggregates, focusRange]);

  const workspaceRadarData = useMemo(() => {
    const totals = workspaceTotalsForRange(aggregates, focusRange);
    return Object.entries(totals)
      .map(([workspace, seconds]) => ({ workspace, hours: Number(toHours(seconds).toFixed(2)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 12);
  }, [aggregates, focusRange]);

  const topWorkspaces = useMemo(() => {
    const current = active;
    if (current?.topWorkspaces?.length) {
      return current.topWorkspaces.slice(0, 5).map((item) => ({
        workspace: item.workspace,
        seconds: metricSum(item.seconds),
      }));
    }
    // Fallback: derive from workspaceSeconds if topWorkspaces not provided.
    const totals: Record<string, number> = {};
    if (current?.workspaceSeconds) {
      for (const [name, seconds] of Object.entries(current.workspaceSeconds)) {
        totals[name] = (totals[name] || 0) + metricSum(seconds);
      }
    }
    return Object.entries(totals)
      .map(([workspace, seconds]) => ({ workspace, seconds }))
      .filter((t) => t.seconds > 0)
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 5);
  }, [active]);

  const navigateToRecentTable = () => router.push("/recent-activity");

  const handleRecentCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, select, option, a, input, textarea")) {return;}
    navigateToRecentTable();
  };

  const handleRecentCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["Enter", " "].includes(event.key)) {return;}
    const target = event.target as HTMLElement;
    if (target.closest("button, select, option, a, input, textarea")) {return;}
    event.preventDefault();
    navigateToRecentTable();
  };

  const remainingMs = useMemo(() => {
    if (!lastRefresh) {return 0;}
    const diff = Date.now() - lastRefresh;
    return Math.max(0, COOLDOWN_MS - diff);
  }, [lastRefresh]);

  const handleRefreshAggregates = async () => {
    if (!user) {return;}
    setRefreshing(true);
    enqueueSnackbar("Starting refresh…", { variant: "info" });
    try {
      const now = Date.now();
      if (remainingMs > 0) {
        enqueueSnackbar("Please wait for the cooldown to expire before refreshing again.", { variant: "warning" });
        return;
      }
      const resp = await fetch("https://clockit-stats-refresh.travpal.workers.dev/api/refresh-aggregation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid, forceMigration: false }),
      });
      if (!resp.ok) {
        throw new Error(`Refresh failed with status ${resp.status}`);
      }
      setLastRefresh(now);
      await setDoc(doc(db, "MaterializedStats", user.uid), { lastRefreshRequested: now }, { merge: true });
      enqueueSnackbar("Refresh triggered. Aggregates will update shortly.", { variant: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to trigger refresh.";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  if (loadingUser || isLoadingStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-600 gap-3">
        <p>Auth error: {authError.message}</p>
        <Link href="/auth" className="text-blue-600 hover:underline">Go to sign in</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-gray-800">
        <p className="text-lg font-semibold">You need to sign in to view your dashboard.</p>
        <div className="flex gap-3">
          <Link href="/auth" className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors">
            Sign in
          </Link>
          <Link href="/auth?mode=signup" className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:border-blue-200 hover:text-blue-700 transition-colors">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const title = user.displayName || user.email || "Developer";

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900">
      <NavBar
        userName={title}
        onSignOut={() => auth.signOut()}
        links={[
          { href: "/dashboard", label: "Dashboard", active: true },
          { href: "/advanced-stats", label: "Advanced Stats" },
          { href: "/recent-activity", label: "Recent Activity" },
          { href: "/docs", label: "Docs" },
          { href: "/profile", label: "Profile" },
        ]}
      />

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm text-blue-600 font-semibold">Dashboard</p>
            <h1 className="text-3xl font-bold text-gray-900">Your productivity at a glance</h1>
            <p className="text-sm text-gray-600 mt-1">
              Data shown for {rangeLabels[range].toLowerCase()}
              {lastUpdated ? ` — last updated ${new Date(lastUpdated).toLocaleString()}` : ""}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {(["week", "month", "year", "all"] as Range[]).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setRange(key);
                  setFocusRange(key);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  range === key
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-200 hover:text-blue-700"
                }`}
              >
                {rangeLabels[key]}
              </button>
            ))}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshAggregates}
                disabled={!user || refreshing || remainingMs > 0}
                className="px-3 py-1.5 rounded-full text-sm font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {refreshing ? "Refreshing…" : "Refresh stats"}
              </button>
              <Cooldown remainingMs={remainingMs} />
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Total time</h2>
            {active ? (
              <div className="space-y-3">
                <MetricRow icon={<IconSum/>} label="Total time" value={formatDuration(active.totalSeconds)} />
                <MetricRow icon={<IconTimeDuration0 />} label="Working time" value={formatDuration(active.workingSeconds)} />
                <MetricRow icon={<IconHourglassEmpty />} label="Idle time" value={formatDuration(active.idleSeconds)} />
              </div>
            ) : (
              <p className="text-sm text-gray-500">{statsError || "No data available."}</p>
            )}
          </div>

          <div className="card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Most used language</h2>
            {active?.topLanguage ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Language</p>
                  <p className="text-2xl font-bold text-gray-900">{active.topLanguage.language}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Focused time</p>
                  <p className="text-xl font-semibold text-blue-700">{formatDuration(active.topLanguage.seconds)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">{statsError || "No language data available."}</p>
            )}
          </div>

          <div className="card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Productivity score</h2>
                    <div className="relative group inline-block mb-2">
                    <span className="text-sm text-gray-600 cursor-pointer underline decoration-dotted">
                      Working vs idle ratio
                    </span>
                    <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-gray-700 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10">
                      Based on aggregated sessions.
                    </div>
                    </div>
            {active ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-gray-900">{active.productivityPercent}%</p>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${active.productivityPercent}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Working: {formatDuration(active.workingSeconds)} · Idle: {formatDuration(active.idleSeconds)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">{statsError || "No productivity data available."}</p>
            )}
          </div>

          <div className="card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top workspaces</h2>
            {topWorkspaces.length === 0 ? (
              <p className="text-sm text-gray-500">{statsError || "No workspace data available."}</p>
            ) : (
              <div className="space-y-2">
                {topWorkspaces.map((ws, idx) => (
                  <div key={ws.workspace} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-gray-900">{ws.workspace}</span>
                    </div>
                    <span className="text-gray-600">{formatDuration(ws.seconds)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Focus radars</h2>
              <p className="text-sm text-gray-600">Language and workspace focus for {rangeLabels[focusRange].toLowerCase()} data.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["week", "month", "year", "all"] as Range[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setFocusRange(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    focusRange === key
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-white text-gray-700 border-gray-200 hover:border-indigo-200 hover:text-indigo-700"
                  }`}
                >
                  {rangeLabels[key]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <RadarPanel
              title="Language focus"
              emptyLabel={statsError || "No language time recorded for this range yet."}
              data={languageRadarData.map((d) => ({ label: d.language, hours: d.hours }))}
              color="#6366f1"
              chartKey={`lang-${focusRange}`}
            />
            <RadarPanel
              title="Workspace focus"
              emptyLabel={statsError || "No workspace time recorded for this range yet."}
              data={workspaceRadarData.map((d) => ({ label: d.workspace, hours: d.hours }))}
              color="#0ea5e9"
              chartKey={`ws-${focusRange}`}
            />
          </div>
        </section>

        {user && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div
              className="lg:col-span-2 card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200"
              role="button"
              tabIndex={0}
              onClick={handleRecentCardClick}
              onKeyDown={handleRecentCardKeyDown}
              aria-label="Open full recent activity table"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Recent activity</h2>
                  <p className="text-xs text-gray-500">Click to open the full table view.</p>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToRecentTable();
                  }}
                >
                  Open table
                </button>
              </div>
              <Stats uid={user.uid} />
            </div>
            <div className="card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload CSV</h2>
              <UploadCSV uid={user.uid} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function MetricRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-500">{icon}</span>}
        <p className="text-sm text-gray-600">{label}</p>
      </div>
      <p className="text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function RadarPanel({
  title,
  emptyLabel,
  data,
  color,
  chartKey,
}: {
  title: string;
  emptyLabel: string;
  data: Array<{ label: string; hours: number }>;
  color: string;
  chartKey?: string;
}) {
  const hasData = data.length > 0;
  return (
    <div className="card-clean bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {hasData && <span className="text-xs text-gray-500">{data.length} entries</span>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
        <div className="lg:col-span-2 h-[260px]">
          {!hasData ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">{emptyLabel}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} key={chartKey}>
                <PolarGrid />
                <PolarAngleAxis dataKey="label" />
                <PolarRadiusAxis angle={45} />
                <Radar name="Hours" dataKey="hours" stroke={color} fill={color} fillOpacity={0.4} />
                <Legend verticalAlign="middle" align="left" layout="vertical" />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="space-y-2">
          {!hasData ? (
            <p className="text-sm text-gray-500">{emptyLabel}</p>
          ) : (
            data.slice(0, 6).map((row, idx) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-semibold" style={{ color }}>
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{row.label}</p>
                    <p className="text-xs text-gray-500">{row.hours.toFixed(2)} hours</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function metricSum(value: MetricValue | undefined | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (value && typeof value.sum === "number" && Number.isFinite(value.sum)) {
    return value.sum;
  }
  return 0;
}

function toHours(value: MetricValue | undefined | null) {
  const seconds = metricSum(value);
  return Number((seconds / 3600).toFixed(2));
}

function languageTotalsForRange(aggregates: Aggregates | null, range: Range) {
  const totals: Record<string, number> = {};
  const entries = aggregates?.[range] ?? [];
  for (const entry of entries) {
    const langSeconds = entry.languageSeconds || {};
    for (const [lang, seconds] of Object.entries(langSeconds)) {
      totals[lang] = (totals[lang] || 0) + metricSum(seconds);
    }
  }
  return totals;
}

function workspaceTotalsForRange(aggregates: Aggregates | null, range: Range) {
  const totals: Record<string, number> = {};
  const entries = aggregates?.[range] ?? [];
  for (const entry of entries) {
    const wsSeconds = entry.workspaceSeconds || {};
    const hasWorkspaceSeconds = Object.keys(wsSeconds).length > 0;
    for (const [ws, seconds] of Object.entries(wsSeconds)) {
      totals[ws] = (totals[ws] || 0) + metricSum(seconds);
    }
    if (!hasWorkspaceSeconds && entry.topWorkspaces) {
      for (const tw of entry.topWorkspaces) {
        totals[tw.workspace] = (totals[tw.workspace] || 0) + metricSum(tw.seconds);
      }
    }
  }
  return totals;
}

function formatDuration(totalSeconds: MetricValue | undefined | null) {
  const seconds = metricSum(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}
