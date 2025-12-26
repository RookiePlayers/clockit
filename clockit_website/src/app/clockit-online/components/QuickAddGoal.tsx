"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconPlus, IconSettingsBolt } from "@tabler/icons-react";
import { AnimatePresence, motion, Transition } from "framer-motion";
import type { Goal, GoalGroup } from "@/types";

type SessionAttachOptions = {
  sessions: Array<{ id: string; label: string }>;
  onAttach: (sessionId: string, goalId: string, goal?: Goal) => void;
};

type Props = {
  user: { uid?: string | null; email?: string | null } | null | undefined;
  customGroups: GoalGroup[];
  onCreateGoal: (input: { title: string; groupId: string; estimatedMinutes?: number }, sessionId?: string) => { id: string; goal?: Goal } | void;
  onCreateGroup: (name: string) => string | null;
  visible?: boolean;
  isCompact?: boolean;
  onToggleCompact?: (next: boolean) => void;
  sessionAttachOptions?: SessionAttachOptions;
  showCreateGroup?: boolean;
  sessionLayout?: boolean;
};

export default function QuickAddGoal({
  user,
  customGroups,
  onCreateGoal,
  onCreateGroup,
  visible = true,
  sessionAttachOptions,
  showCreateGroup = true,
  sessionLayout = false,
  isCompact = false,
  onToggleCompact,
}: Props) {
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | "">("");
  const [newGoalGroupId, setNewGoalGroupId] = useState<string>("day");
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [compact, setCompact] = useState(isCompact);
  const [configOpen, setConfigOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCompact(isCompact);
  }, [isCompact]);

  useEffect(() => {
    if (!textareaRef.current) {return;}
    const el = textareaRef.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [newGoalTitle]);

  const sessionOptions = useMemo(() => sessionAttachOptions?.sessions ?? [], [sessionAttachOptions]);

  useEffect(() => {
    if (sessionOptions.length && !selectedSessionId) {
      setSelectedSessionId(sessionOptions[0].id);
    }
  }, [sessionOptions, selectedSessionId]);

  const handleSubmit = () => {
    const title = newGoalTitle.trim();
    if (!title) {return;}
    const result = onCreateGoal(
      {
        title,
        groupId: newGoalGroupId,
        estimatedMinutes: typeof estimatedMinutes === "number" ? estimatedMinutes : undefined,
      },
      sessionOptions.length ? selectedSessionId : undefined,
    );
    if (sessionOptions.length && selectedSessionId && result?.id) {
      sessionAttachOptions?.onAttach(selectedSessionId, result.id, result.goal);
    }
    setNewGoalTitle("");
    setEstimatedMinutes("");
  };

  const handleCreateGroup = () => {
    const name = newGroupName.trim();
    if (!name) {return;}
    const id = onCreateGroup(name);
    if (id) {
      setNewGoalGroupId(id);
      setNewGroupName("");
    }
  };

  if (!visible || typeof document === "undefined" || !mounted) {return null;}

  const renderForm = () => {
    return (
      <div className="flex flex-row gap-2 md:flex-row md:items-end">
        <button
          onClick={() => setConfigOpen(true)}
          className="px-3 h-full min-h-[40px] rounded-lg border border-[var(--border)] bg-[var(--card-soft)] text-[var(--text)] text-sm hover:border-[var(--text)]/40 flex items-center justify-center self-end"
        >
          <span className="block md:hidden">
            <IconSettingsBolt size={20} />
          </span>
          <span className="hidden md:block">Configuration</span>
        </button>
        <div className="flex-1 relative flex flex-col justify-end">
          <textarea
            ref={textareaRef}
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            placeholder="Add a goal…"
            rows={1}
            className="w-full mb-0 border border-[var(--border)] bg-[var(--card-soft)] text-[var(--text)] rounded-lg px-3 pr-14 md:pr-32 py-2 text-md placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none min-h-[34px] leading-relaxed overflow-hidden"
          />
          <button
            onClick={handleSubmit}
            disabled={!newGoalTitle.trim()}
            className={`absolute right-0.5 scale-90 bottom-0 px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-semibold inline-flex items-center gap-1 text-sm mb-1 ${
              newGoalTitle.trim()
          ? "bg-[var(--primary)] text-[var(--primary-contrast)] hover:opacity-90"
          : "bg-[var(--pill)] text-slate-500 cursor-not-allowed"
            }`}
          >
            <span className="block md:hidden">
              <IconPlus size={16} />
            </span>
            <span className="hidden md:inline-flex items-center gap-1">
              <IconPlus size={16} /> Create
            </span>
          </button>
        </div>
        <div className="w-20 md:w-32 self-end">
          <input
            type="number"
            min={0}
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Est. min"
            className="w-full border border-[var(--border)] bg-[var(--card-soft)] text-[var(--text)] rounded-lg px-2 md:px-3 py-2 md:text-md placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      </div>
    );
  };

  const configPanel = (
    <AnimatePresence>
      {configOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfigOpen(false)}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] rounded-t-2xl p-4 shadow-2xl shadow-blue-900/20 bg-[var(--card)]/95 backdrop-blur-md sm:max-w-lg sm:mx-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[var(--text)]">Goal configuration</p>
              <button
                onClick={() => setConfigOpen(false)}
                className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-soft)]"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-[var(--muted)]">Group</label>
                <select
                  value={newGoalGroupId}
                  onChange={(e) => setNewGoalGroupId(e.target.value)}
                  className="w-full border border-[var(--border)] bg-[var(--card-soft)] text-[var(--text)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="day">Today (by day)</option>
                  {customGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              {showCreateGroup && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-[var(--muted)]">Create group</label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="New custom group"
                      className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-slate-400 focus:outline-none focus:border-[var(--text)]/40"
                    />
                    <button
                      onClick={handleCreateGroup}
                      className="px-3 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] text-sm font-semibold hover:opacity-90 border border-[var(--primary)]"
                    >
                      Create group
                    </button>
                  </div>
                </div>
              )}
              {sessionLayout && sessionOptions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-[var(--muted)]">Attach to session</label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full border border-[var(--border)] bg-[var(--card-soft)] text-[var(--text)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    {sessionOptions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="hidden lg:block px-2 py-1 text-xs font-semibold rounded-full bg-[var(--pill)] text-[var(--text)]">Quick add</span>
      <p className=" hidden lg:block text-sm text-[var(--muted)]">
        Add a goal to today or a custom group.
      </p>
      {!user && (
        <a href="/auth" className="text-sm font-semibold text-blue-600 hover:underline">
          Sign in to sync
        </a>
      )}
    </div>
  );

  const transition: Transition = { duration: 0.12, ease: "easeOut" };

  return createPortal(
    <div className="fixed bottom-0 left-0 right-0 z-30 px-0 sm:px-0 pointer-events-none">
      <div className="pointer-events-auto w-full bg-[var(--bg)]/95 backdrop-blur-md border-t border-[var(--border)] shadow-lg shadow-black/10">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 flex justify-center">
        <AnimatePresence mode="wait">
          {compact ? (
            <motion.button
              key="compact"
              layoutId="quick-add-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={transition}
              onClick={() => {
                setNewGoalTitle("");
                setEstimatedMinutes("");
                setNewGoalGroupId("day");
                setCompact(false);
                onToggleCompact?.(false);
              }}
              className="flex w-full max-w-2xl items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[var(--card)] text-[var(--text)] border border-[var(--border)] shadow-lg shadow-blue-900/10 hover:bg-[var(--card-soft)]"
            >
              <IconPlus size={18} /> Add new goal
            </motion.button>
          ) : (
            <motion.div
              key="expanded"
              layoutId="quick-add-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={transition}
              className="w-full"
            >
              <div className="pointer-events-auto w-full bg-[var(--card)] text-[var(--text)] rounded-2xl shadow-2xl shadow-blue-900/10 border border-[var(--border)] p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  {header}
                  <button
                    onClick={() => { setCompact(true); onToggleCompact?.(true); }}
                    className="hidden lg:block text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-soft)]"
                  >
                    Collapse
                  </button>
                </div>
                {renderForm()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {configPanel}
        </div>
      </div>
    </div>,
    document.body,
  );
}
