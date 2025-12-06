"use client";

import { useMemo, useState } from "react";
import { languageTotalsForRange, toHours, useFetchAggregates, workspaceTotalsForRange } from "@/hooks/useFetchAggregates";
import { Range, rangeLabels } from "@/types";
import { RadarPanel } from "./RadarPanel";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

type Props = {
  statsError?: string | null;
  initialRange?: Range;
};

export default function FocusRadars({ initialRange = "week" }: Props) {
  const [range, setRange] = useState<Range>(initialRange);
  const [user] = useAuthState(auth);
  const { aggregates, error: statsError, isLoading } = useFetchAggregates(user?.uid);

  const radarData = useMemo(() => {
    const totals = languageTotalsForRange(aggregates, range);
    return Object.entries(totals)
      .map(([language, seconds]) => ({ language, hours: Number(toHours(seconds).toFixed(2)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 12);
  }, [aggregates, range]);

  const workspaceRadarData = useMemo(() => {
    const totals = workspaceTotalsForRange(aggregates, range);
    return Object.entries(totals)
      .map(([workspace, seconds]) => ({ workspace, hours: Number(toHours(seconds).toFixed(2)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 12);
  }, [aggregates, range]);

  if (isLoading) {
    return (
      <section className="card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="animate-pulse h-48 bg-gray-100 rounded-lg" />
      </section>
    );
  }

  if (statsError) {
    return (
      <section className="card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <p className="text-sm text-red-600">Error loading focus radars: {statsError}</p>
      </section>
    );
  }
  return (
    <section className="card-clean bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Focus radars</h2>
          <p className="text-sm text-gray-600">Language and workspace focus across {rangeLabels[range].toLowerCase()} buckets.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["week", "month", "year", "all"] as Range[]).map((key) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                range === key
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
  );
}
