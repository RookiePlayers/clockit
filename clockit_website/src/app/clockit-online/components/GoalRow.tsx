"use client";

import {
  IconGripVertical,
  IconLock,
  IconTrash,
} from "@tabler/icons-react";
import { formatDayLabel, toDateKey } from "../utils";
import type { Goal, GoalGroup } from "@/types";

type Props = {
  goal: Goal;
  onToggle: () => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (overId: string) => void;
  onMove: (targetGroupId: string) => void;
  onToggleLock: () => void;
  canToggleLock: boolean;
  onDelete: () => void;
  allGroups: GoalGroup[];
  currentUserId: string;
  dragging: boolean;
};

export default function GoalRow({
  goal,
  onToggle,
  onDragStart,
  onDragEnd,
  onDrop,
  onMove,
  onToggleLock,
  canToggleLock,
  onDelete,
  allGroups,
  currentUserId,
  dragging,
}: Props) {
  const canMove = !goal.locked || (goal.createdBy ? goal.createdBy === currentUserId : true);
  const canDelete = !goal.locked || (goal.createdBy ? goal.createdBy === currentUserId : true);

  return (
    <div
      draggable={!goal.locked}
      onDragStart={() => {
        if (goal.locked) {return;}
        onDragStart(goal.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        if (goal.locked) {return;}
        e.preventDefault();
        onDrop(goal.id);
      }}
      className={`flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 ${
        dragging ? "border-blue-300 bg-blue-500/10" : ""
      }`}
    >
      {goal.locked ? (
        <div className="mt-1 text-slate-400 cursor-not-allowed" aria-label="Locked goal">
          <IconLock size={16} />
        </div>
      ) : (
        <button
          className="mt-1 text-slate-400 hover:text-[var(--text)] cursor-grab"
          aria-label="Drag to reorder"
          onClick={(e) => e.preventDefault()}
        >
          <IconGripVertical size={16} />
        </button>
      )}
      <label className="flex-1 space-y-1 cursor-pointer">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={goal.completed}
            onChange={onToggle}
            className="h-4 w-4 rounded border-[var(--border)] bg-[var(--card)] accent-[var(--primary)]"
          />
          <span className={`font-semibold ${goal.completed ? "line-through text-slate-400" : "text-[var(--text)]"}`}>
            {goal.title}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="px-2 py-1 rounded-full bg-[var(--pill)] border border-[var(--border)]">
            {goal.groupName}
          </span>
          <span>{formatDayLabel(toDateKey(goal.createdAt))}</span>
          {goal.estimatedGoalTime ? (
            <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-100 border border-amber-500/40">
              Est: {Math.round(goal.estimatedGoalTime / 60)}m
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full bg-[var(--pill)] border border-[var(--border)] text-[var(--muted)]">No estimate</span>
          )}
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => e.target.value && onMove(e.target.value)}
              value={goal.groupId}
              disabled={!canMove}
              className={`text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--text)] ${!canMove ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
              {!allGroups.some((g) => g.id === goal.groupId) && <option value={goal.groupId}>{goal.groupName}</option>}
            </select>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onToggleLock(); }}
              disabled={!canToggleLock}
              className={`text-xs px-2 py-1 rounded border ${canToggleLock ? "border-[var(--border)] text-[var(--text)]" : "border-[var(--border)] text-slate-400 cursor-not-allowed"}`}
            >
              {goal.locked ? "Unlock" : "Lock"}
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); if (canDelete) { onDelete(); } }}
              disabled={!canDelete}
              className={`text-xs px-2 py-1 rounded border ${canDelete ? "border-rose-300 text-rose-400 hover:bg-rose-600 hover:text-white" : "border-[var(--border)] text-slate-400 cursor-not-allowed"}`}
              aria-label="Delete goal"
            >
              <IconTrash size={14} />
            </button>
          </div>
        </div>
      </label>
    </div>
  );
}
