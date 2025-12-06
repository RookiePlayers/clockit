"use client";

import { useMemo, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Cooldown from "@/components/Cooldown";
import { useSnackbar } from "notistack";

type Props = {
  userId?: string | null;
  lastRefresh: number | null;
  onRefreshed?: (ts: number) => void;
  cooldownMs?: number;
  label?: string;
  className?: string;
};

export default function RefreshAggregates({
  userId,
  lastRefresh,
  onRefreshed,
  cooldownMs = 60 * 60 * 1000,
  label = "Refresh stats",
  className = "",
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const remainingMs = useMemo(() => {
    if (!lastRefresh) {return 0;}
    const diff = Date.now() - lastRefresh;
    return Math.max(0, cooldownMs - diff);
  }, [lastRefresh, cooldownMs]);

  const handleRefresh = async () => {
    if (!userId) {
      enqueueSnackbar("Sign in to refresh aggregates.", { variant: "warning" });
      return;
    }
    if (remainingMs > 0) {
      enqueueSnackbar("Please wait for the cooldown to expire before refreshing again.", { variant: "warning" });
      return;
    }
    setRefreshing(true);
    enqueueSnackbar("Starting refresh…", { variant: "info" });
    try {
      const now = Date.now();
      const resp = await fetch("https://clockit-stats-refresh.travpal.workers.dev/api/refresh-aggregation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, forceMigration: false }),
      });
      if (!resp.ok) {
        throw new Error(`Refresh failed with status ${resp.status}`);
      }
      onRefreshed?.(now);
      await setDoc(doc(db, "MaterializedStats", userId), { lastRefreshRequested: now }, { merge: true });
      enqueueSnackbar("Refresh triggered. Aggregates will update shortly.", { variant: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to trigger refresh.";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleRefresh}
        disabled={!userId || refreshing || remainingMs > 0}
        className="px-3 py-1.5 rounded-full text-sm font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {refreshing ? "Refreshing…" : label}
      </button>
      <Cooldown remainingMs={remainingMs} />
    </div>
  );
}
