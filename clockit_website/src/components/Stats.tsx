"use client";

import { useCollection } from "react-firebase-hooks/firestore";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, DocumentData } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

interface StatsProps {
  uid: string;
}

export default function Stats({ uid }: StatsProps) {
  const [snapshot, loading, error] = useCollection(
    query(collection(db, "Uploads", uid, "CSV"), orderBy("uploadedAt", "desc"), limit(5))
  );

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
      <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </div>
        <p className="text-gray-500 font-medium">No data found</p>
        <p className="text-sm text-gray-400">Upload a CSV to see your stats</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = snapshot.docs.map((doc) => {
    const data = doc.data() as DocumentData;
    const date = data.uploadedAt?.toDate?.() ? data.uploadedAt.toDate().toLocaleDateString() : "";
    const entries = data.data?.length || 0;
    return { date, entries };
  }).reverse();

  return (
    <div className="space-y-6">
      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="entries" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
      {/* List of recent uploads */}
      <div className="space-y-3">
        {snapshot.docs.map((doc) => {
          const data = doc.data() as DocumentData;
          const rowCount = data.data?.length || 0;
          return (
            <motion.div
              key={doc.id}
              className="group flex justify-between items-center bg-white hover:bg-gray-50 transition-colors border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{data.filename}</h4>
                  <p className="text-xs text-gray-500">{data.uploadedAt?.toDate?.().toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
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
