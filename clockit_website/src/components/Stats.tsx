"use client";

import { useCollection } from "react-firebase-hooks/firestore";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, DocumentData } from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

interface StatsProps {
  uid: string;
}

export default function Stats({ uid }: StatsProps) {
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">("line");
  const [snapshot, loading, error] = useCollection(
    query(collection(db, "Uploads", uid, "CSV"), orderBy("uploadedAt", "desc"), limit(50))
  );

  // Only consider uploads in the last 30 days
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const chartData = useMemo(() => {
    const docs = snapshot?.docs ?? [];
    return docs
      .map((doc) => {
        const data = {
          id: doc.id,
          ...doc.data(),
        } as DocumentData & { id: string };
        const uploadedAt = data.uploadedAt?.toDate?.() ? data.uploadedAt.toDate() : null;
        if (!uploadedAt || uploadedAt < thirtyDaysAgo) {return null;}

        const rows = Array.isArray(data.data) ? data.data : [];
        const totalSeconds = rows.reduce((sum, row) => {
          const endedIso = row?.endedIso || row?.endedISO;
          const durationSeconds = Number(row?.durationSeconds ?? 0);
          // Use endedIso date for the bucket
          const ended = endedIso ? new Date(endedIso) : uploadedAt;
          if (ended < thirtyDaysAgo) {return sum;}
          return sum + (Number.isFinite(durationSeconds) ? durationSeconds : 0);
        }, 0);

        const endedDates = rows
          .map((row) => {
            const endedIso = row?.endedIso || row?.endedISO;
            return endedIso ? new Date(endedIso) : uploadedAt;
          })
          .filter((d: Date | null): d is Date => !!d)
          .filter((d) => d >= thirtyDaysAgo);

        const dateForLabel = endedDates.length ? endedDates[0] : uploadedAt;
        const date = dateForLabel.toLocaleDateString();
        const hours = Number((totalSeconds / 3600).toFixed(2));
        return { date, hours };
      })
      .filter(Boolean)
      .reduce((acc, curr) => {
        const existing = acc.find((x) => x.date === curr!.date);
        if (existing) {
          existing.hours += (curr as {
            date: string;
            hours: number; 
          }).hours;
        } else {
          acc.push(curr as {
            date: string;
            hours: number;
          });
        }
        return acc;
      }, [] as Array<{ date: string; hours: number }>)
      .reverse();
  }, [snapshot?.docs, thirtyDaysAgo]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-sm p-4 bg-red-50 rounded-xl border border-red-100">Error loading stats</div>;
  }

  if (!snapshot || snapshot.empty) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--card)]">
        <div className="w-12 h-12 bg-[var(--card)] rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </div>
        <p className="text-gray-500 font-medium">No data found</p>
        <p className="text-sm text-gray-400">Upload a CSV to see your stats</p>
      </div>
    );
  }

  const renderChart = () => {
    if (chartData.length === 0) {
      return <p className="text-sm text-gray-500">No uploads in the last 30 days.</p>;
    }
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 20, left: 0, bottom: 5 },
    };
    const fontSize = 13;
    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                label={{ value: "Date", position: "insideBottomRight", offset: -5, fontSize }}
                tick={{ fontSize }}
              />
              <YAxis
                label={{ value: "Hours", angle: -90, position: "insideLeft", fontSize }}
                tick={{ fontSize }}
              />
              <Tooltip />
              <Bar dataKey="hours" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        );
      case "pie": {
        const total = chartData.reduce((sum, d) => sum + d.hours, 0);
        const pieData = chartData.map((d) => ({ name: d.date, value: d.hours || 0 }));
        const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6366f1", "#06b6d4"];
        return (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Tooltip />
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
            </PieChart>
            <p className="text-xs text-gray-500 mt-2">Total hours: {total.toFixed(2)}</p>
          </ResponsiveContainer>
        );
      }
      case "line":
      default:
        return (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                label={{ value: "Date", position: "insideBottomRight", offset: -5, fontSize }}
                tick={{ fontSize }}
              />
              <YAxis
                label={{ value: "Hours", angle: -90, position: "insideLeft", fontSize }}
                tick={{ fontSize }}
              />
              <Tooltip />
              <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  const recentDocs = snapshot.docs
    .map((doc) => ({ doc, data: doc.data() as DocumentData }))
    .filter(({ data }) => {
      const uploadedAt = data.uploadedAt?.toDate?.() ? data.uploadedAt.toDate() : null;
      return uploadedAt && uploadedAt >= thirtyDaysAgo;
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 justify-end">
        <label className="text-xs text-gray-500">Chart:</label>
        <select
          className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-700"
          value={chartType}
          onChange={(e) => setChartType(e.target.value as "line" | "bar" | "pie")}
        >
          <option value="line">Line</option>
          <option value="bar">Bar</option>
          <option value="pie">Pie</option>
        </select>
      </div>
      {renderChart()}

      {/* List of recent uploads (last 30 days) */}
      <div className="space-y-3">
        {recentDocs.length === 0 && (
          <p className="text-sm text-gray-500">No uploads in the last 30 days.</p>
        )}
        {recentDocs.map(({ doc, data }) => {
          const rowCount = data.data?.length || 0;
          const uploadedAtDate = data.uploadedAt?.toDate?.() ? data.uploadedAt.toDate() : null;
          const uploadedAtLabel = uploadedAtDate
            ? uploadedAtDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
            : "—";
          const ideName = typeof data.ideName === "string" && data.ideName.trim()
            ? data.ideName.trim()
            : typeof data.meta?.ideName === "string" && data.meta.ideName.trim()
              ? data.meta.ideName.trim()
              : "Secret IDE";
          return (
            <motion.div
              key={doc.id}
              className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[var(--card)] hover:bg-[var(--card-soft)] transition-colors border border-[var(--border)] rounded-xl p-4 shadow-sm hover:shadow-md"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-4 w-full min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {data.filename ?? doc.id}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        data.filename ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {!data.filename ? "auto" : "manual"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {ideName}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{uploadedAtLabel}</p>
                </div>
              </div>
              <div className="text-left sm:text-right w-full sm:w-auto">
                <span className="block text-lg font-bold text-gray-900">{rowCount.toLocaleString()}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Entries</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
