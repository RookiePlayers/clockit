"use client";

import { useMemo, useState } from "react";
import { IconDownload, IconGripVertical, IconLayoutBottombarExpand, IconPlayerPlayFilled, IconPlayerStopFilled } from "@tabler/icons-react";
import type { ClockitSession, Goal } from "@/types";
import { formatDuration } from "../utils";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  session: ClockitSession;
  duration: number;
  attachableGoals: Goal[];
  onAttach: (sessionId: string, goalId: string) => void;
  onDetach: (sessionId: string, goalId: string) => void;
  onToggleGoal: (sessionId: string, goalId: string) => void;
  onStop: (sessionId: string) => void;
  onResume: (sessionId: string) => void;
  minimized?: boolean;
  onToggleMinimize?: (next: boolean) => void;
};

export default function SessionCard({
  session,
  duration,
  attachableGoals,
  onAttach,
  onDetach,
  onToggleGoal,
  onStop,
  onResume,
  minimized = false,
  onToggleMinimize,
}: Props) {
  const [selected, setSelected] = useState("");

  const goalsChip = useMemo(
    () => `${session.goals.length} goal${session.goals.length === 1 ? "" : "s"}`,
    [session.goals.length],
  );

  return (
    <motion.div
      className={`border border-[var(--border)] bg-[var(--card)] rounded-2xl ${minimized ? "p-3 gap-2 scale-[0.98]" : "p-4 gap-3"} flex flex-col session-drag`}
      style={{
        listStyle: "none",
        width: "100%",
        ...(minimized ? { minHeight: "140px", opacity: 0.95 } : {}),
      }}
      onClick={() => minimized && onToggleMinimize?.(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (minimized && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggleMinimize?.(false);
        }
      }}
      aria-expanded={!minimized}
      aria-label={`Session card ${session.label}`}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
    >
      <div className="flex items-center justify-between gap-3 select-none">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <p className="text-xs uppercase tracking-wide text-blue-500">Session</p>
            <p className="text-xs text-slate-300 uppercase tracking-wide">
              {session.running ? "Running" : session.endedAt ? "Stopped" : "Paused"}
            </p>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text)]">{session.label}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleMinimize?.(!minimized)}
            className="p-2 rounded-lg border border-[var(--border)] text-[var(--text)] bg-[var(--card-soft)]"
            aria-label={minimized ? "Expand session" : "Minimize session"}
          >
            <IconLayoutBottombarExpand
              size={16}
              className={minimized ? "rotate-180 transition-transform" : "transition-transform"}
            />
          </button>
          {session.running ? (
            <button
              onClick={() => onStop(session.id)}
              className="p-2 rounded-lg border border-[var(--border)] text-rose-500 bg-[var(--card-soft)] hover:bg-rose-50"
              aria-label="Stop Session"
            >
              <IconPlayerStopFilled size={16} />
            </button>
          ) : (
            <button
              onClick={() => onResume(session.id)}
              className="p-2 rounded-lg border border-[var(--border)] text-emerald-500 bg-[var(--card-soft)] hover:bg-emerald-50"
              aria-label="Resume Session"
            >
              <IconPlayerPlayFilled size={16} />
            </button>
          )}
          <div
            className="session-drag-handle cursor-grab p-2 rounded-lg border border-[var(--border)] bg-[var(--card-soft)]"
            aria-label="Drag session card"
            role="button"
            tabIndex={-1}
          >
            <IconGripVertical size={16} />
          </div>
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs text-slate-300 flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--pill)] text-[var(--text)] border border-[var(--border)]">
              {goalsChip}
            </span>
          </p>
          <div className="text-4xl font-mono text-[var(--text)]">{formatDuration(duration)}</div>
          {minimized && session.goals.length > 0 && (
            <div className="mt-2 text-xs text-[var(--muted)] italic">
              {session.goals.length} goal{session.goals.length === 1 ? "" : "s"} hidden — expand to view your session goals
            </div>
          )}
        </div>
        {!session.running && session.endedAt && (
          <div className="flex items-center gap-2 text-xs text-emerald-200">
            <IconDownload size={14} /> CSV ready
          </div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {!minimized && (
          <motion.div
            key="goals"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="border border-[var(--border)] rounded-xl p-3 bg-[var(--card-soft)] space-y-2 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--text)] font-semibold">Attached goals</p>
              <span className="text-xs text-[var(--muted)]">{session.groupName || "No group"}</span>
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
              {session.goals.length === 0 && <span className="text-xs text-[var(--muted)]">No goals attached yet.</span>}
              {session.goals.map((goal) => (
                <label
                  key={goal.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                >
                  <input
                    type="checkbox"
                    checked={goal.completed}
                    onChange={() => onToggleGoal(session.id, goal.id)}
                    className="h-4 w-4 rounded border-[var(--border)] bg-[var(--card)] accent-[var(--primary)]"
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${goal.completed ? "line-through text-[var(--muted)]" : "text-[var(--text)]"}`}>{goal.title}</p>
                    <p className="text-xs text-[var(--muted)]">{goal.groupName}</p>
                  </div>
                  <button
                    onClick={() => onDetach(session.id, goal.id)}
                    className="text-slate-400 hover:text-[var(--text)] text-sm"
                  >
                    ×
                  </button>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]"
              >
                <option value="">Attach goal…</option>
                {attachableGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!selected) {return;}
                  onAttach(session.id, selected);
                  setSelected("");
                }}
                disabled={!selected}
                className={`px-3 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 ${
                  selected ? "bg-[var(--primary)] text-[var(--primary-contrast)]" : "bg-[var(--pill)] text-slate-500 cursor-not-allowed"
                }`}
              >
                +
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
