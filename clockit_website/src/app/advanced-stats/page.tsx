"use client";

"use client";

// Disable static pre-render to avoid Firebase client init during build without env vars
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import Cooldown from "@/components/Cooldown";
import NavBar from "@/components/NavBar";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSnackbar } from "notistack";

type Range = "week" | "month" | "year" | "all";

export type MetricStats = {
  sum: number;
  avg: number;
  min: number;
  max: number;
};

type MetricValue = number | MetricStats;

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


type Aggregates = Partial<Record<Range, AggregateEntry[]>>;

type Grade = { letter: string; description: string };

const rangeLabels: Record<Range, string> = {
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
  all: "All time",
};

type ChartView = "stackedArea" | "stackedBar" | "line";

const chartViews: Array<{ key: ChartView; label: string }> = [
  { key: "stackedArea", label: "Stacked area" },
  { key: "stackedBar", label: "Stacked bars" },
  { key: "line", label: "Lines" },
];

export default function AdvancedStatsPage() {
  const [user, loadingUser, authError] = useAuthState(auth);
  const [range, setRange] = useState<Range>("week");
  const [languageRange, setLanguageRange] = useState<Range>("week");
  const [chartView, setChartView] = useState<ChartView>("stackedArea");
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
  const { enqueueSnackbar } = useSnackbar();
  const lastSavedBadgesRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAggregates(null);
      setIsLoading(false);
      setLastRefresh(null);
      return;
    }
    setIsLoading(true);
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
        const data = snap.data() as { aggregates?: Aggregates; lastRefreshRequested?: number };
        setAggregates(data.aggregates || null);
        const ts = data.lastRefreshRequested;
        if (typeof ts === "number" && Number.isFinite(ts)) {
          setLastRefresh(ts);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load stats";
        setStatsError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAggregates();
  }, [user]);

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
      if (remainingMs > 0) {
        enqueueSnackbar("Please wait for the cooldown to expire before refreshing again.", { variant: "warning" });
        return;
      }
      const now = Date.now();
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

  const formatCooldown = () => {
    if (remainingMs <= 0) return "Ready to refresh";
    const mins = Math.ceil(remainingMs / 60000);
    return `Available in ${mins} min`;
  };

  const trendData = useMemo(() => {
    const list = aggregates?.[range] ?? [];
    return [...list]
      .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime())
      .map((entry) => ({
        label: formatBucketLabel(entry.periodStart, range),
        workingHours: toHours(entry.workingSeconds),
        idleHours: toHours(entry.idleSeconds),
        productivity: entry.productivityPercent ?? 0,
      }));
  }, [aggregates, range]);

  const radarData = useMemo(() => {
    const totals = languageTotalsForRange(aggregates, languageRange);
    return Object.entries(totals)
      .map(([language, seconds]) => ({ language, hours: Number(toHours(seconds).toFixed(2)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 12);
  }, [aggregates, languageRange]);

  const workspaceRadarData = useMemo(() => {
    const totals = workspaceTotalsForRange(aggregates, languageRange);
    return Object.entries(totals)
      .map(([workspace, seconds]) => ({ workspace, hours: Number(toHours(seconds).toFixed(2)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 12);
  }, [aggregates, languageRange]);

  const rangeTotals = useMemo(() => computeRangeTotals(aggregates, range), [aggregates, range]);
  const rangeLanguageTotals = useMemo(() => languageTotalsForRange(aggregates, range), [aggregates, range]);
  const rangeWorkspaceTotals = useMemo(() => workspaceTotalsForRange(aggregates, range), [aggregates, range]);
  const yearSummary = useMemo(() => computeYearSummary(aggregates), [aggregates]);
  const badges = useMemo(() => computeBadges(aggregates), [aggregates]);

  useEffect(() => {
    if (!user || !aggregates) {return;}
    const summary = badges.map((b) => ({
      title: b.title,
      description: b.description,
      detail: b.detail,
      earned: b.earned,
    }));
    const serialized = JSON.stringify(summary);
    if (serialized === lastSavedBadgesRef.current) {return;}
    lastSavedBadgesRef.current = serialized;
    void setDoc(
      doc(db, "Achievements", user.uid),
      { badges: summary, updatedAt: serverTimestamp(), userId: user.uid },
      { merge: true }
    ).catch((err) => {
      // Surface silently to console to avoid interrupting UX with badge persistence issues.
      console.error("Failed to save achievements", err);
    });
  }, [aggregates, badges, user]);

  if (loadingUser || isLoading) {
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
        <p className="text-lg font-semibold">You need to sign in to view advanced stats.</p>
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
          { href: "/dashboard", label: "Dashboard" },
          { href: "/advanced-stats", label: "Advanced Stats", active: true },
          { href: "/recent-activity", label: "Recent Activity" },
          { href: "/docs", label: "Docs" },
          { href: "/profile", label: "Profile" },
        ]}
      />

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm text-blue-600 font-semibold">Advanced stats</p>
            <h1 className="text-3xl font-bold text-gray-900">Deep dive into your patterns</h1>
            <p className="text-sm text-gray-600 mt-1">Explore working vs idle trends, language mix, and your yearly performance.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {(["week", "month", "year", "all"] as Range[]).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setRange(key);
                  setLanguageRange(key); // keep radars in sync with primary range selection
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
                {refreshing ? "Refreshing…" : "Refresh aggregates"}
              </button>
              <Cooldown remainingMs={remainingMs} />
            </div>
          </div>
        </header>

        <section className="card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Working vs idle</h2>
              <p className="text-sm text-gray-600">Multi-view trend for {rangeLabels[range].toLowerCase()} buckets.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {chartViews.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setChartView(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    chartView === key
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-200 hover:text-blue-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[320px]">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                {statsError || "No aggregated data yet for this range."}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {renderWorkingIdleChart(chartView, trendData)}
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat label="Avg productivity" value={`${average(trendData.map((d) => d.productivity)).toFixed(0)}%`} />
            <MiniStat label="Total working" value={`${sum(trendData.map((d) => d.workingHours)).toFixed(1)} h`} />
            <MiniStat label="Total idle" value={`${sum(trendData.map((d) => d.idleHours)).toFixed(1)} h`} />
            <MiniStat label="Data points" value={`${trendData.length}`} />
          </div>
        </section>

        <section className="card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Range totals</h2>
              <p className="text-sm text-gray-600">Sums across all aggregated entries for this view.</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              {rangeLabels[range]}
            </span>
          </div>
          {!rangeTotals ? (
            <p className="text-sm text-gray-500">{statsError || "No aggregated data yet for this range."}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Total time" value={`${toHours(rangeTotals.totalSeconds).toFixed(1)} h`} />
                <MiniStat label="Working time" value={`${toHours(rangeTotals.workingSeconds).toFixed(1)} h`} />
                <MiniStat label="Idle time" value={`${toHours(rangeTotals.idleSeconds).toFixed(1)} h`} />
                {rangeTotals.sessions > 0 && (
                  <MiniStat label="Sessions" value={`${rangeTotals.sessions.toFixed(0)}`} />
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TotalsList
                  title="Languages"
                  emptyLabel="No language data yet for this range."
                  items={Object.entries(rangeLanguageTotals)
                    .map(([label, seconds]) => ({ label, value: toHours(seconds) }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5)}
                />
                <TotalsList
                  title="Workspaces"
                  emptyLabel="No workspace data yet for this range."
                  items={Object.entries(rangeWorkspaceTotals)
                    .map(([label, seconds]) => ({ label, value: toHours(seconds) }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5)}
                />
              </div>
            </>
          )}
        </section>

        <section className="card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Focus radars</h2>
              <p className="text-sm text-gray-600">Language and workspace focus across {rangeLabels[languageRange].toLowerCase()} buckets.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["week", "month", "year", "all"] as Range[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setLanguageRange(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    languageRange === key
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
              data={radarData.map((d) => ({ label: d.language, hours: d.hours }))}
              color="#6366f1"
            />
            <RadarPanel
              title="Workspace focus"
              emptyLabel={statsError || "No workspace time recorded for this range yet."}
              data={workspaceRadarData.map((d) => ({ label: d.workspace, hours: d.hours }))}
              color="#0ea5e9"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Yearly recap</h2>
                <p className="text-sm text-gray-600">Highlights pulled from your latest full year.</p>
              </div>
            </div>
            {!yearSummary ? (
              <p className="text-sm text-gray-500">We&apos;ll surface a recap once yearly data is available.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MiniStat label="Year" value={yearSummary.yearLabel} />
                  <MiniStat label="Working time" value={`${yearSummary.workingHours.toFixed(1)} h`} />
                  <MiniStat label="Idle time" value={`${yearSummary.idleHours.toFixed(1)} h`} />
                  <MiniStat label="Avg productivity" value={`${yearSummary.avgProductivity.toFixed(0)}%`} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <RecapCard title="Peak month" value={yearSummary.bestMonth ?? "—"} hint={yearSummary.bestMonthHint} />
                  <RecapCard title="Best week" value={yearSummary.bestWeek ?? "—"} hint={yearSummary.bestWeekHint} />
                  <RecapCard title="Top language" value={yearSummary.topLanguage ?? "—"} hint={yearSummary.topLanguageHint} />
                  <RecapCard title="Top workspace" value={yearSummary.topWorkspace ?? "—"} hint={yearSummary.topWorkspaceHint} />
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="text-sm text-blue-900">
                    {yearSummary.narrative}
                  </p>
                </div>
              </div>
            )}
          </div>
            <div className="card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-full">
            <div className="flex flex-col flex-1 justify-center items-center text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Final grade</h2>
              <span className="text-sm text-gray-500 mb-3">based on focus and throughput</span>
              {!yearSummary ? (
              <p className="text-sm text-gray-500">No yearly data yet to compute a grade.</p>
              ) : (
              <div className="flex items-center justify-center mb-2 flex-1">
                <span className="text-[5em] font-black text-blue-700">{yearSummary.grade.letter}</span>
              </div>
              )}
            </div>
            {yearSummary && (
              <div className="mt-4">
              <p className="text-sm text-gray-700 mt-2 mb-4">{yearSummary.grade.description}</p>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                className="h-full bg-blue-600 rounded-full"
                style={{ width: `${Math.min(100, yearSummary.avgProductivity)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Grade blends productivity and total working time for the year.
              </p>
              </div>
            )}
            </div>
        </section>

        <section className="card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Badge cabinet</h2>
              <p className="text-sm text-gray-600">Accolades unlocked from your aggregates.</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              {badges.filter((b) => b.earned).length} / {badges.length} unlocked
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.title}
                className={`p-4 rounded-xl border shadow-sm ${badge.earned ? "border-green-200 bg-green-50" : "border-gray-100 bg-white"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{badge.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{badge.detail}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${badge.earned ? "bg-green-200 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                    {badge.earned ? "Unlocked" : "Locked"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function renderWorkingIdleChart(view: ChartView, data: Array<{ label: string; workingHours: number; idleHours: number; productivity: number }>) {
  const shared = (
    <>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
    </>
  );

  if (view === "stackedArea") {
    return (
      <AreaChart data={data} margin={{ left: 8, right: 8 }}>
        {shared}
        <Area type="monotone" dataKey="workingHours" stackId="time" stroke="#2563eb" fill="#2563eb" fillOpacity={0.35} name="Working (hrs)" />
        <Area type="monotone" dataKey="idleHours" stackId="time" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Idle (hrs)" />
        <Line type="monotone" dataKey="productivity" stroke="#10b981" strokeWidth={2} dot={false} name="Productivity %" yAxisId={1} />
        <YAxis orientation="right" yAxisId={1} tick={{ fontSize: 12 }} domain={[0, 100]} />
      </AreaChart>
    );
  }

  if (view === "stackedBar") {
    return (
      <BarChart data={data} margin={{ left: 8, right: 8 }}>
        {shared}
        <Bar dataKey="workingHours" stackId="time" fill="#2563eb" name="Working (hrs)" />
        <Bar dataKey="idleHours" stackId="time" fill="#f59e0b" name="Idle (hrs)" />
      </BarChart>
    );
  }

  return (
    <LineChart data={data} margin={{ left: 8, right: 8 }}>
      {shared}
      <Line type="monotone" dataKey="workingHours" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="Working (hrs)" />
      <Line type="monotone" dataKey="idleHours" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Idle (hrs)" />
      <Line type="monotone" dataKey="productivity" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} name="Productivity %" yAxisId={1} />
      <YAxis orientation="right" yAxisId={1} tick={{ fontSize: 12 }} domain={[0, 100]} />
    </LineChart>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-lg border border-gray-100 bg-gray-50">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function RecapCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="px-4 py-3 rounded-lg border border-gray-100 bg-white shadow-sm">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function RadarPanel({
  title,
  emptyLabel,
  data,
  color,
}: {
  title: string;
  emptyLabel: string;
  data: Array<{ label: string; hours: number }>;
  color: string;
}) {
  const hasData = data.length > 0;
  return (
    <div className="card-clean bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {hasData && <span className="text-xs text-gray-500">{data.length} entries</span>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
        <div className="lg:col-span-2 h-[280px]">
          {!hasData ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">{emptyLabel}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data}>
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
                {/* <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
                  {(row.hours * 60).toFixed(0)} mins
                </span> */}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatBucketLabel(periodStart: string, range: Range) {
  if (range === "all") {return "All time";}
  const date = new Date(periodStart);
  const options: Intl.DateTimeFormatOptions =
    range === "week"
      ? { month: "short", day: "numeric" }
      : range === "month"
        ? { month: "short", year: "numeric" }
        : { year: "numeric" };
  return new Intl.DateTimeFormat("en", options).format(date);
}

function metricSum(value: MetricValue | undefined | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (value && typeof value.avg === "number" && Number.isFinite(value.avg)) {
    return value.avg;
  }
  return 0;
}

function toHours(value: MetricValue | undefined | null) {
  const seconds = metricSum(value);
  return Number((seconds / 3600).toFixed(2));
}

function sum(values: number[]) {
  return values.reduce((acc, curr) => acc + (Number.isFinite(curr) ? curr : 0), 0);
}

function average(values: number[]) {
  const filtered = values.filter((v) => Number.isFinite(v));
  if (filtered.length === 0) {return 0;}
  return sum(filtered) / filtered.length;
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

function computeRangeTotals(aggregates: Aggregates | null, range: Range) {
  const entries = aggregates?.[range] ?? [];
  if (!entries.length) {return null;}
  return entries.reduce(
    (acc, entry) => ({
      totalSeconds: acc.totalSeconds + metricSum(entry.totalSeconds),
      workingSeconds: acc.workingSeconds + metricSum(entry.workingSeconds),
      idleSeconds: acc.idleSeconds + metricSum(entry.idleSeconds),
      sessions: acc.sessions + (entry.sessionCount ? metricSum(entry.sessionCount) : 0),
    }),
    { totalSeconds: 0, workingSeconds: 0, idleSeconds: 0, sessions: 0 }
  );
}

function computeYearSummary(aggregates: Aggregates | null) {
  const years = aggregates?.year ?? [];
  if (!years.length) {return null;}
  const sorted = [...years].sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime());
  const latest = sorted[0];
  const currentYear = new Date(latest.periodStart).getFullYear();
  const months = (aggregates?.month ?? []).filter((m) => new Date(m.periodStart).getFullYear() === currentYear);
  const weeks = (aggregates?.week ?? []).filter((w) => new Date(w.periodStart).getFullYear() === currentYear);

  const bestMonth = months.reduce<AggregateEntry | null>(
    (best, curr) => (!best || metricSum(curr.workingSeconds) > metricSum(best.workingSeconds) ? curr : best),
    null
  );
  const bestWeek = weeks.reduce<AggregateEntry | null>(
    (best, curr) => (!best || metricSum(curr.workingSeconds) > metricSum(best.workingSeconds) ? curr : best),
    null
  );

  const avgProd = average(months.map((m) => m.productivityPercent)) || latest.productivityPercent || 0;
  const workingHours = toHours(latest.workingSeconds);
  const idleHours = toHours(latest.idleSeconds);

  const topLanguageEntry = latest.topLanguage?.language
    ? { language: latest.topLanguage.language, seconds: metricSum(latest.topLanguage.seconds) }
    : pickTopLanguage(latest.languageSeconds || {});
  const topWorkspaceEntry = pickTopWorkspace(latest);

  const grade = computeGrade(avgProd, workingHours);

  const narrativeParts = [
    `You shipped ${workingHours.toFixed(1)} hours of focused work`,
    `kept idle to ${idleHours.toFixed(1)} hours`,
    `and averaged ${avgProd.toFixed(0)}% productivity.`,
  ];
  if (bestMonth) {
    narrativeParts.push(`Your strongest month was ${formatBucketLabel(bestMonth.periodStart, "month")}.`);
  }
  if (topLanguageEntry?.language) {
    narrativeParts.push(`You leaned most on ${topLanguageEntry.language}.`);
  }
  if (topWorkspaceEntry?.workspace) {
    narrativeParts.push(`Your most active workspace was ${topWorkspaceEntry.workspace}.`);
  }

  return {
    yearLabel: currentYear.toString(),
    workingHours,
    idleHours,
    avgProductivity: avgProd,
    bestMonth: bestMonth ? formatBucketLabel(bestMonth.periodStart, "month") : undefined,
    bestMonthHint: bestMonth ? `${toHours(bestMonth.workingSeconds).toFixed(1)}h working` : undefined,
    bestWeek: bestWeek ? formatBucketLabel(bestWeek.periodStart, "week") : undefined,
    bestWeekHint: bestWeek ? `${toHours(bestWeek.workingSeconds).toFixed(1)}h working` : undefined,
    topLanguage: topLanguageEntry?.language,
    topLanguageHint: topLanguageEntry ? `${toHours(topLanguageEntry.seconds).toFixed(1)}h logged` : undefined,
    topWorkspace: topWorkspaceEntry?.workspace,
    topWorkspaceHint: topWorkspaceEntry ? `${toHours(topWorkspaceEntry.seconds).toFixed(1)}h logged` : undefined,
    grade,
    narrative: narrativeParts.join(" "),
  };
}

function computeGrade(avgProductivity: number, workingHours: number): Grade {
  const hoursScore = Math.min(100, (workingHours / 250) * 100);
  const blended = Math.round(avgProductivity * 0.65 + hoursScore * 0.35);
  if (blended >= 95) {return { letter: "A+", description: "Elite focus and output across the year." };}
  if (blended >= 85) {return { letter: "A", description: "Outstanding consistency with strong throughput." };}
  if (blended >= 75) {return { letter: "B", description: "Great momentum—keep the cadence going." };}
  if (blended >= 65) {return { letter: "C", description: "Solid foundation with room to tighten focus." };}
  return { letter: "D", description: "Opportunities to reduce idle time and increase deep work blocks." };
}

function pickTopLanguage(languageSeconds: Record<string, MetricValue>) {
  let best: { language: string; seconds: number } | null = null;
  for (const [language, seconds] of Object.entries(languageSeconds)) {
    const totalSeconds = metricSum(seconds);
    if (!best || totalSeconds > best.seconds) {
      best = { language, seconds: totalSeconds };
    }
  }
  return best;
}

function pickTopWorkspace(entry: AggregateEntry) {
  if (entry.topWorkspaces?.length) {
    const sorted = [...entry.topWorkspaces].sort((a, b) => metricSum(b.seconds) - metricSum(a.seconds));
    const top = sorted[0];
    return { workspace: top.workspace, seconds: metricSum(top.seconds) };
  }
  const wsMap = entry.workspaceSeconds || {};
  let best: { workspace: string; seconds: number } | null = null;
  for (const [workspace, seconds] of Object.entries(wsMap)) {
    const totalSeconds = metricSum(seconds);
    if (!best || totalSeconds > best.seconds) {
      best = { workspace, seconds: totalSeconds };
    }
  }
  return best;
}

function computeBadges(aggregates: Aggregates | null) {
  const weeks = aggregates?.week ?? [];
  const months = aggregates?.month ?? [];
  const activeWeeks = weeks.filter((w) => metricSum(w.workingSeconds) >= 3600).length;
  const avgProductivity = average(weeks.map((w) => w.productivityPercent));
  const allEntry = aggregates?.all?.[0];
  const totalHours = toHours(allEntry?.workingSeconds ?? 0);
  const idleRatio = allEntry
    ? Math.round((metricSum(allEntry.idleSeconds) / Math.max(1, metricSum(allEntry.totalSeconds))) * 100)
    : 0;
  const languageSeconds = allEntry?.languageSeconds || {};
  const strongLanguages = Object.values(languageSeconds).filter((sec) => toHours(sec) >= 3).length;
  const bestWeekHours = weeks.reduce((max, w) => Math.max(max, toHours(w.workingSeconds)), 0);
  const bestMonthHours = months.reduce((max, m) => Math.max(max, toHours(m.workingSeconds)), 0);
  const totalSessions =
    metricSum(allEntry?.sessionCount) ||
    weeks.reduce((acc, w) => acc + (w.sessionCount ? metricSum(w.sessionCount) : 0), 0);

  return [
    {
      title: "Consistency Champ",
      description: "Logged meaningful work across many weeks.",
      detail: `${activeWeeks} active weeks`,
      earned: activeWeeks >= 8,
    },
    {
      title: "Focus Master",
      description: "Sustained high productivity against idle time.",
      detail: `Avg productivity ${avgProductivity.toFixed(0)}%`,
      earned: avgProductivity >= 75,
    },
    {
      title: "Time Investor",
      description: "Significant hours invested into deep work.",
      detail: `${totalHours.toFixed(1)}h shipped`,
      earned: totalHours >= 120,
    },
    {
      title: "Polyglot Developer",
      description: "Multiple languages with meaningful focus time.",
      detail: `${strongLanguages} languages over 3h`,
      earned: strongLanguages >= 3,
    },
    {
      title: "Idle Slayer",
      description: "Kept idle time proportional to output.",
      detail: `Idle ratio ${idleRatio}%`,
      earned: idleRatio > 0 && idleRatio <= 35,
    },
    {
      title: "Weekly Warrior",
      description: "Hit a strong weekly deep work block.",
      detail: `Best week ${bestWeekHours.toFixed(1)}h`,
      earned: bestWeekHours >= 25,
    },
    {
      title: "Marathon Coder",
      description: "Massive working time across all history.",
      detail: `${totalHours.toFixed(1)}h total working`,
      earned: totalHours >= 250,
    },
    {
      title: "Session Grinder",
      description: "Plenty of individual sessions logged.",
      detail: `${totalSessions.toFixed(0)} sessions`,
      earned: totalSessions >= 200,
    },
    {
      title: "Monthly Peak",
      description: "A standout month of output.",
      detail: `Best month ${bestMonthHours.toFixed(1)}h`,
      earned: bestMonthHours >= 90,
    },
  ];
}

function TotalsList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
  emptyLabel: string;
}) {
  const hasItems = items.length > 0;
  return (
    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {hasItems && <span className="text-xs text-gray-500">{items.length} entries</span>}
      </div>
      {!hasItems ? (
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {items.map((row, idx) => (
            <div key={row.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="font-semibold text-gray-900">{row.label}</span>
              </div>
              <span className="text-sm text-gray-700">{row.value.toFixed(2)} h</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
