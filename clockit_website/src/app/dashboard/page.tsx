"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import UploadCSV from "@/components/UploadCSV";
import Stats from "@/components/Stats";
import Image from "next/image";
import { IconHourglassEmpty, IconSum, IconTimeDuration0, IconTimelineEvent } from "@tabler/icons-react";

type Range = "week" | "month" | "year" | "all";

type AggregateEntry = {
  periodStart: string;
  totalSeconds: number;
  idleSeconds: number;
  workingSeconds: number;
  languageSeconds?: Record<string, number>;
  topWorkspaces?: Array<{ workspace: string; seconds: number }>;
  workspaceSeconds?: Record<string, number>;
  productivityScore?: number;
  productivityPercent: number;
  topLanguage?: { language: string; seconds: number } | null;
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
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAggregates(null);
      setIsLoadingStats(false);
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
        const data = snap.data() as { aggregates?: Aggregates };
        setAggregates(data.aggregates || null);
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

  const topWorkspaces = useMemo(() => {
    const current = active;
    if (current?.topWorkspaces?.length) {
      return current.topWorkspaces.slice(0, 5).map((item) => ({
        workspace: item.workspace,
        seconds: Number(item.seconds || 0),
      }));
    }
    // Fallback: derive from workspaceSeconds if topWorkspaces not provided.
    const totals: Record<string, number> = {};
    if (current?.workspaceSeconds) {
      for (const [name, seconds] of Object.entries(current.workspaceSeconds)) {
        totals[name] = (totals[name] || 0) + Number(seconds || 0);
      }
    }
    return Object.entries(totals)
      .map(([workspace, seconds]) => ({ workspace, seconds }))
      .filter((t) => t.seconds > 0)
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 5);
  }, [active]);

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
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.png" alt="Clockit Icon" width={28} height={28} className="rounded-full" />
            <span className="font-bold text-lg text-gray-900">Clockit</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-gray-600">Hi, {title}</span>
            <Link href="/dashboard" className="text-gray-900 font-semibold">Dashboard</Link>
            <Link href="/advanced-stats" className="text-gray-600 hover:text-gray-900">Advanced Stats</Link>
            <Link href="/docs" className="text-gray-600 hover:text-gray-900">Docs</Link>
            <Link href="/profile" className="text-gray-600 hover:text-gray-900">Profile</Link>
            <button
              onClick={() => auth.signOut()}
              className="px-3 py-1.5 rounded-lg font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm text-blue-600 font-semibold">Dashboard</p>
            <h1 className="text-3xl font-bold text-gray-900">Your productivity at a glance</h1>
            <p className="text-sm text-gray-600 mt-1">Data shown for {rangeLabels[range].toLowerCase()}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["week", "month", "year", "all"] as Range[]).map((key) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  range === key
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-200 hover:text-blue-700"
                }`}
              >
                {rangeLabels[key]}
              </button>
            ))}
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

        {user && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent activity</h2>
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

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}
