"use client";

import { useCallback, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { IconChecks, IconClockPlay, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconTargetArrow, IconTimelineEvent } from "@tabler/icons-react";
import NavBar from "@/components/NavBar";
import { auth } from "@/lib/firebase";
import type { ClockitSession, Goal } from "@/types";
import type { GroupView } from "./types";
import { toDateKey } from "./utils";
import GoalsTab from "./components/GoalsTab";
import SessionsTab from "./components/SessionsTab";

const csvHeader =
  "startedIso,endedIso,durationSeconds,idleSeconds,linesAdded,linesDeleted,perFileSeconds,perLanguageSeconds,authorName,authorEmail,machine,ideName,workspace,repoPath,branch,issueKey,comment,goals\n";

const downloadSessionCsv = (session: ClockitSession, userName?: string, userEmail?: string) => {
  if (!session.endedAt) {return;}
  const startedIso = new Date(session.startedAt).toISOString();
  const endedIso = new Date(session.endedAt).toISOString();
  const durationMs = session.accumulatedMs ?? session.endedAt - session.startedAt;
  const durationSeconds = Math.max(1, Math.round(durationMs / 1000));
  const values = [
    startedIso,
    endedIso,
    durationSeconds,
    session.idleSeconds ?? 0,
    session.linesAdded ?? 0,
    session.linesDeleted ?? 0,
    JSON.stringify(session.perFileSeconds ?? {}),
    JSON.stringify(session.perLanguageSeconds ?? {}),
    userName ?? "Clockit Online",
    userEmail ?? "",
    "Clockit Online",
    "Clockit Online",
    "Clockit Online",
    "",
    "",
    session.groupName ?? "",
    session.comment ?? "",
    JSON.stringify(
      session.goals.map((g) => ({
        title: g.title,
        completed: g.completed,
        completedAt: g.completedAt,
        groupId: g.groupId,
        groupName: g.groupName,
        estimatedGoalTime: g.estimatedGoalTime,
      })),
    ),
  ];

  const row =
    values
      .map((value) => {
        const str = String(value ?? "");
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      })
      .join(",") + "\n";

  const blob = new Blob([csvHeader + row], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `clockit-session-${toDateKey(startedIso)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function ClockitOnlinePage() {
  const [user] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState<"goals" | "sessions">("goals");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const sessionStarterRef = useRef<((group: GroupView) => void) | null>(null);

  const handleRegisterStartFromGroup = useCallback((fn: (group: GroupView) => void) => {
    sessionStarterRef.current = fn;
  }, []);

  const handleStartClockit = useCallback(
    (group: GroupView) => {
      sessionStarterRef.current?.(group);
      setActiveTab("sessions");
    },
    [],
  );

  return (
    <div className="min-h-screen theme-bg">
      <NavBar
        userName={user?.displayName || user?.email || undefined}
        onSignOut={user ? () => auth.signOut() : undefined}
        links={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/clockit-online", label: "Clockit Online", active: true },
          { href: "/advanced-stats", label: "Advanced Stats" },
          { href: "/recent-activity", label: "Recent Activity" },
          { href: "/docs", label: "Docs" },
          { href: "/profile", label: "Profile" },
        ]}
      />

      <main className="max-w-6xl mx-auto px-6 pb-32 pt-8 relative">
        <div
          className="lg:grid lg:gap-6"
          style={{ gridTemplateColumns: sidebarCollapsed ? "64px 1fr" : "260px 1fr" }}
        >
          <aside className="hidden lg:block sticky top-28 self-start">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 shadow-lg shadow-blue-900/10 backdrop-blur">
                <div className="flex items-center justify-between mb-2">
                {!sidebarCollapsed && (
                  <span className="text-xs uppercase tracking-wide text-blue-500">Clockit Online</span>
                )}
                <button
                  onClick={() => setSidebarCollapsed((v) => !v)}
                  className="p-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-soft)]"
                  aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
                >
                  {sidebarCollapsed ? <IconLayoutSidebarLeftExpand size={16} /> : <IconLayoutSidebarLeftCollapse size={16} />}
                </button>
                </div>
              <div className="flex flex-col gap-2">
                {[
                  { key: "goals", label: "Clockit Goals", Icon: IconTargetArrow },
                  { key: "sessions", label: "Clockit Sessions", Icon: IconTimelineEvent },
                ].map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as "goals" | "sessions")}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl font-semibold transition-colors ${
                      activeTab === key
                        ? "bg-[var(--primary)] text-[var(--primary-contrast)] shadow"
                        : "bg-[var(--card-soft)] text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    <Icon size={16} />
                    {!sidebarCollapsed && <span>{label}</span>}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <div className={activeTab === "goals" ? "block" : "hidden"}>
              <GoalsTab user={user} goals={goals} setGoals={setGoals} onStartClockit={handleStartClockit} showQuickAdd={activeTab === "goals"} />
            </div>
            <div className={activeTab === "sessions" ? "block" : "hidden"}>
              <SessionsTab
                user={user}
                goals={goals}
                setGoals={setGoals}
                setActiveTab={setActiveTab}
                onRegisterStartFromGroup={handleRegisterStartFromGroup}
                downloadSessionCsv={downloadSessionCsv}
                showQuickAdd={activeTab === "sessions"}
              />
            </div>
          </div>
        </div>

        <div className="lg:hidden fixed top-3 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] z-40">
          <div className="bg-[var(--card)]/85 backdrop-blur-md border border-[var(--border)]/70 rounded-2xl shadow-xl shadow-blue-900/10 px-3 py-3 flex items-center justify-around">
            {[
              { key: "goals", label: "Goals", Icon: IconChecks },
              { key: "sessions", label: "Sessions", Icon: IconClockPlay },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as "goals" | "sessions")}
                className={`flex flex-col items-center gap-1 text-xs font-semibold ${
                  activeTab === key ? "text-[var(--text)]" : "text-[var(--muted)]"
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
