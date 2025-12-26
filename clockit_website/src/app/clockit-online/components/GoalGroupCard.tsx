"use client";

import { IconClockPlay } from "@tabler/icons-react";
import useInfiniteLoader from "../hooks/useInfiniteLoader";
import GoalRow from "./GoalRow";
import type { GoalGroup } from "@/types";
import type { GroupView } from "../types";

type Props = {
  group: GroupView;
  expanded: boolean;
  visibleCount: number;
  hasMore: boolean;
  onToggle: () => void;
  onStart: () => void;
  onLoadMore: () => void;
  onToggleGoal: (goalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
  onDrop: (fromId: string, toId: string) => void;
  onCollapse: () => void;
  onMove: (goalId: string, groupId: string, groupName: string) => void;
  allGroups: GoalGroup[];
  onToggleLock: (goalId: string) => void;
  currentUserId: string;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
};

export default function GoalGroupCard({
  group,
  expanded,
  visibleCount,
  hasMore,
  onToggle,
  onStart,
  onLoadMore,
  onToggleGoal,
  onDeleteGoal,
  onDrop,
  onCollapse,
  onMove,
  allGroups,
  onToggleLock,
  currentUserId,
  draggingId,
  setDraggingId,
}: Props) {
  const loaderRef = useInfiniteLoader(onLoadMore, hasMore);

  return (
    <div className="border border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-lg shadow-blue-900/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 session-drag-handle cursor-grab">
        <div>
          <button onClick={onToggle} className="text-left">
            <div className="text-sm text-blue-200 flex items-center gap-2">
              {group.kind === "day" ? "Day" : "Custom"} · {group.subtitle}
            </div>
            <h3 className="text-xl font-semibold text-[var(--text)]">{group.label}</h3>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onStart}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)] text-[var(--primary-contrast)] font-semibold rounded-lg hover:opacity-90 transition-colors"
          >
            <IconClockPlay size={16} /> Start Clockit
          </button>
          <button
            onClick={expanded ? onCollapse : onToggle}
            className="px-3 py-1.5 rounded-lg text-sm border border-[var(--border)] text-[var(--text)] hover:border-[var(--text)]/30"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4">
          <div className="border-t border-[var(--border)] pt-3">
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {group.goals.slice(0, visibleCount).map((goal) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  dragging={draggingId === goal.id}
                  onDragStart={(id) => setDraggingId(id)}
                  onDragEnd={() => setDraggingId(null)}
                  onDrop={(overId) => onDrop(draggingId || goal.id, overId)}
                  onToggle={() => onToggleGoal(goal.id)}
                  onMove={(targetGroupId) => {
                    const target = allGroups.find((g) => g.id === targetGroupId);
                    if (target) {
                      onMove(goal.id, target.id, target.name);
                    }
                  }}
                  onDelete={() => onDeleteGoal(goal.id)}
                  onToggleLock={() => onToggleLock(goal.id)}
                  canToggleLock={!goal.locked || (goal.createdBy ? goal.createdBy === currentUserId : true)}
                  allGroups={allGroups}
                  currentUserId={currentUserId}
                />
              ))}
              {group.goals.length === 0 && (
                <div className="text-sm text-slate-500 py-6 text-center">No goals in this group yet.</div>
              )}
              {hasMore && (
                <div ref={loaderRef} className="flex items-center justify-center py-3">
                  <button
                    onClick={onLoadMore}
                    className="text-xs text-[var(--text)] px-3 py-1.5 rounded-full border border-[var(--border)] hover:border-[var(--text)]/30"
                  >
                    Load more
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
