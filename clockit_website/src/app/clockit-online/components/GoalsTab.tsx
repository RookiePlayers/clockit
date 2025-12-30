"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { IconInfoCircle, IconSearch, IconSparkles } from "@tabler/icons-react";
import type { Goal, GoalGroup } from "@/types";
import { DEFAULT_PAGE_SIZE, STORAGE_KEY_CUSTOM_GROUPS, STORAGE_KEY_GOALS } from "../constants";
import { formatDayLabel, toDateKey } from "../utils";
import type { GroupView } from "../types";
import GoalGroupCard from "./GoalGroupCard";
import QuickAddGoal from "./QuickAddGoal";
import { goalsApi } from "@/lib/api-client";
import { useSnackbar } from "notistack";

type Props = {
  user: { uid?: string | null; email?: string | null } | null | undefined;
  goals: Goal[];
  setGoals: Dispatch<SetStateAction<Goal[]>>;
  onStartClockit: (group: GroupView) => void;
  showQuickAdd?: boolean;
};

type GoalsTabProps = Props & { goalsEnabled?: boolean };

const SAMPLE_BASE = Date.parse("2024-01-01T12:00:00Z");
const makeIso = (offsetDays: number, hour: number) => {
  const d = new Date(SAMPLE_BASE - offsetDays * 24 * 60 * 60 * 1000);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
};

const seedGoals: Goal[] = [
  { id: "goal-hero", title: "Design Clockit Online hero section", createdAt: makeIso(0, 9), completed: false, groupId: "group-launch", groupName: "Launch Prep", estimatedGoalTime: 5400, order: 0, createdBy: "sample", locked: true },
  { id: "goal-socket", title: "Wire realtime socket handshake", createdAt: makeIso(0, 10), completed: true, completedAt: makeIso(0, 11), groupId: "group-launch", groupName: "Launch Prep", estimatedGoalTime: 3600, order: 1, createdBy: "sample", locked: true },
  { id: "goal-ux", title: "Mobile nav polish for tab rail", createdAt: makeIso(0, 12), completed: false, groupId: "group-deep-work", groupName: "Deep Work", estimatedGoalTime: 2700, order: 2, createdBy: "sample", locked: true },
  { id: "goal-observability", title: "Add session observability hooks", createdAt: makeIso(1, 9), completed: false, groupId: "group-deep-work", groupName: "Deep Work", estimatedGoalTime: 2400, order: 3, createdBy: "sample", locked: true },
  { id: "goal-notifications", title: "Draft notifications for stopped timers", createdAt: makeIso(1, 11), completed: true, completedAt: makeIso(1, 12), groupId: "group-growth", groupName: "Growth Experiments", estimatedGoalTime: 1800, order: 4, createdBy: "sample", locked: true },
  { id: "goal-screenshot", title: "Capture CSV parity screenshot", createdAt: makeIso(2, 10), completed: false, groupId: "group-launch", groupName: "Launch Prep", estimatedGoalTime: 1500, order: 5, createdBy: "sample", locked: true },
  { id: "goal-cleanup", title: "Refactor goals drag-and-drop flow", createdAt: makeIso(2, 13), completed: false, groupId: "group-deep-work", groupName: "Deep Work", estimatedGoalTime: 2100, order: 6, createdBy: "sample", locked: true },
  { id: "goal-timing", title: "Calibrate idle trimming defaults", createdAt: makeIso(3, 8), completed: false, groupId: "group-growth", groupName: "Growth Experiments", estimatedGoalTime: 3200, order: 7, createdBy: "sample", locked: true },
  { id: "goal-backlog", title: "Write API contract for clockit-server", createdAt: makeIso(3, 15), completed: true, completedAt: makeIso(3, 16), groupId: "group-launch", groupName: "Launch Prep", estimatedGoalTime: 4200, order: 8, createdBy: "sample", locked: true },
];

const isSampleGoalSet = (list: Goal[]) =>
  list.length === seedGoals.length && seedGoals.every((seed) => list.some((g) => g.id === seed.id));

const sortGoals = (list: Goal[]) =>
  [...list].sort((a, b) => {
    if (a.completed !== b.completed) {return a.completed ? 1 : -1;}
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    if (orderA !== orderB) {return orderA - orderB;}
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  });

const arrayMove = <T,>(list: T[], from: number, to: number) => {
  const clone = [...list];
  const [item] = clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
};

export default function GoalsTab({ user, goals, setGoals, onStartClockit, showQuickAdd = true, goalsEnabled = true }: GoalsTabProps) {
  const readPersistedGoals = () => {
    if (typeof window === "undefined") {return null;}
    const stored = localStorage.getItem(STORAGE_KEY_GOALS);
    if (!stored) {return null;}
    try {
      return JSON.parse(stored) as Goal[];
    } catch {
      return null;
    }
  };

  const [persistedGoals] = useState<Goal[] | null>(() => readPersistedGoals());
  const [usingSampleGoals, setUsingSampleGoals] = useState<boolean>(() => {
    const data = readPersistedGoals();
    return !(data && !isSampleGoalSet(data));
  });
  const [viewTab, setViewTab] = useState<"all" | "daily" | "custom" | "examples">("all");
  const groupingMode = viewTab === "daily" ? "day" : "group";
  const [customGroups, setCustomGroups] = useState<GoalGroup[]>(() => {
    if (typeof window === "undefined") {return [];}
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_GROUPS);
    if (!stored) {return [];}
    try {
      return JSON.parse(stored) as GoalGroup[];
    } catch {
      return [];
    }
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [visibleGoalCount, setVisibleGoalCount] = useState<Record<string, number>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const hasLoadedCloud = useRef(false);
  const hasLoadedGroups = useRef(false);
  const { enqueueSnackbar } = useSnackbar();
  const currentUserId = user?.uid || user?.email || "guest";

  useEffect(() => {
    if (user || goals.length) {return;}
    if (persistedGoals && !isSampleGoalSet(persistedGoals)) {
      setGoals(persistedGoals);
    }
  }, [goals.length, persistedGoals, setGoals, user]);

  useEffect(() => {
    const loadFromCloud = async () => {
      if (!user?.uid || hasLoadedCloud.current) {return;}
      try {
        const response = await goalsApi.list();
        const cloudGoals = response.goals;
        setGoals(cloudGoals);
        setUsingSampleGoals(false);
        hasLoadedCloud.current = true;
      } catch {
        // ignore cloud load errors for now
      }
    };
    loadFromCloud();
  }, [setGoals, user]);

  useEffect(() => {
    const loadGroupsFromCloud = async () => {
      if (!user?.uid || hasLoadedGroups.current) {return;}
      try {
        const response = await goalsApi.listGroups();
        const groups = response.groups;
        if (groups.length) {
          setCustomGroups(groups);
        }
        hasLoadedGroups.current = true;
      } catch {
        // ignore cloud load errors for now
      }
    };
    loadGroupsFromCloud();
  }, [setCustomGroups, user]);

  useEffect(() => {
    const pushToCloud = async () => {
      if (!user?.uid) {return;}
      try {
        await goalsApi.sync(goals);
      } catch {
        // ignore sync errors silently
      }
    };
    if (user?.uid) {
      pushToCloud();
    }
  }, [goals, user]);

  useEffect(() => {
    const pushGroupsToCloud = async () => {
      if (!user?.uid) {return;}
      try {
        await goalsApi.syncGroups(customGroups);
      } catch {
        // ignore sync errors silently
      }
    };
    if (user?.uid) {
      pushGroupsToCloud();
    }
  }, [customGroups, user]);

  const effectiveUsingSampleGoals = user ? false : usingSampleGoals;

  useEffect(() => {
    if (typeof window === "undefined" || user) {return;}
    if (usingSampleGoals) {return;}
    localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(goals));
  }, [goals, user, usingSampleGoals]);

  useEffect(() => {
    if (typeof window === "undefined" || user) {return;}
    localStorage.setItem(STORAGE_KEY_CUSTOM_GROUPS, JSON.stringify(customGroups));
  }, [customGroups, user]);

  const handleGroupToggle = useCallback(
    (id: string, intent: "toggle" | "expand" | "collapse" = "toggle") => {
      setExpandedGroupId((current) => {
        if (intent === "collapse") {
          return current === id ? null : current;
        }
        if (intent === "expand") {
          return id;
        }
        return current === id ? null : id;
      });
    },
    [],
  );

  const baseGoals = useMemo(() => {
    if (viewTab === "examples") {return seedGoals;}
    if (!user && effectiveUsingSampleGoals) {return [];}
    return goals;
  }, [effectiveUsingSampleGoals, goals, user, viewTab]);

  const filteredGoals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {return baseGoals;}
    return baseGoals.filter(
      (g) =>
        g.title.toLowerCase().includes(term) ||
        g.groupName.toLowerCase().includes(term) ||
        toDateKey(g.createdAt).includes(term),
    );
  }, [baseGoals, searchTerm]);

  const groupedGoals = useMemo<GroupView[]>(() => {
    const buildDayGroups = (excludeCustomFromDay: boolean) => {
      const customCountByDate = new Map<string, number>();
      const buckets = new Map<string, Goal[]>();
      for (const goal of filteredGoals) {
        const dateKey = toDateKey(goal.createdAt);
        if (!goal.groupId.startsWith("day-") && excludeCustomFromDay) {
          customCountByDate.set(dateKey, (customCountByDate.get(dateKey) ?? 0) + 1);
          continue;
        }
        const key = `day-${dateKey}`;
        const existing = buckets.get(key) ?? [];
        existing.push(goal);
        buckets.set(key, existing);
      }
      return Array.from(buckets.entries())
        .sort(([a], [b]) => (a > b ? -1 : 1))
        .map(([key, list]) => {
          const dateKey = key.replace("day-", "");
          const customCount = customCountByDate.get(dateKey) ?? 0;
          const subtitleBase = `${list.length} goal${list.length === 1 ? "" : "s"}`;
          const subtitle = customCount ? `${subtitleBase} (+${customCount} custom)` : subtitleBase;
          return {
            id: key,
            label: formatDayLabel(dateKey),
            subtitle,
            goals: sortGoals(list),
            kind: "day" as const,
            dateKey,
          };
        });
    };

    const buildCustomGroups = () => {
      const byGroup = new Map<string, Goal[]>();
      for (const goal of filteredGoals) {
        if (goal.groupId?.startsWith("day-")) {continue;} // skip day buckets from custom grouping
        const existing = byGroup.get(goal.groupId) ?? [];
        existing.push(goal);
        byGroup.set(goal.groupId, existing);
      }
      const metas: GoalGroup[] = [
        ...customGroups,
        ...Array.from(byGroup.keys())
          .filter((id) => !customGroups.some((g) => g.id === id))
          .map((id) => ({ id, name: byGroup.get(id)?.[0]?.groupName || id, kind: "custom" as const })),
      ];
      return metas
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((meta) => {
          const list = byGroup.get(meta.id) ?? [];
          return {
            id: meta.id,
            label: meta.name,
            subtitle: meta.description ?? `${list.length || "No"} goal${list.length === 1 ? "" : "s"}`,
            goals: sortGoals(list),
            kind: meta.kind,
            groupId: meta.id,
          };
        });
    };

    if (viewTab === "daily") {
      return buildDayGroups(false);
    }
    if (viewTab === "custom") {
      return buildCustomGroups();
    }
    // "all" shows both day buckets and custom groups; avoid duplicates by excluding custom goals from day buckets but reference the count
    const dayGroups = buildDayGroups(true);
    const customGroupViews = buildCustomGroups();
    return [...dayGroups, ...customGroupViews];
  }, [customGroups, filteredGoals, viewTab]);

  const moveTargets = useMemo<GoalGroup[]>(() => {
    const dayBuckets = Array.from(new Set(baseGoals.map((g) => `day-${toDateKey(g.createdAt)}`))).map((id) => ({
      id,
      name: formatDayLabel(id.replace("day-", "")),
      kind: "day" as const,
    }));
    const custom = [...customGroups];
    return [...custom, ...dayBuckets];
  }, [baseGoals, customGroups]);

  const handleCreateGroup = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      enqueueSnackbar("Group name is required", { variant: "error" });
      return null;
    }
    const id = `group-${trimmed.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;
    const meta: GoalGroup = { id, name: trimmed, kind: "custom", createdAt: new Date().toISOString(), description: "Custom group" };
    setCustomGroups((prev) => [...prev, meta]);
    enqueueSnackbar("Group created", { variant: "success" });
    return id;
  };

  const handleCreateGoal = ({ title, groupId, estimatedMinutes }: { title: string; groupId: string; estimatedMinutes?: number }) => {
    const trimmed = title.trim();
    if (!trimmed) {return;}
    const createdAt = new Date().toISOString();
    const targetGroupId = groupId === "day" ? `day-${toDateKey(createdAt)}` : groupId;
    const selectedCustom = customGroups.find((g) => g.id === targetGroupId);
    const groupName = selectedCustom?.name ?? formatDayLabel(toDateKey(createdAt));
    const goal: Goal = {
      id: `goal-${Math.random().toString(36).slice(2, 9)}`,
      title: trimmed,
      createdAt,
      completed: false,
      groupId: targetGroupId,
      groupName,
      createdBy: currentUserId,
      locked: false,
      estimatedGoalTime: typeof estimatedMinutes === "number" ? estimatedMinutes * 60 : undefined,
      order: Date.now(),
    };
    setGoals((prev) => [goal, ...prev]);
    setUsingSampleGoals(false);
    setExpandedGroupId(targetGroupId);
    setVisibleGoalCount((prev) => ({ ...prev, [targetGroupId]: Math.max(prev[targetGroupId] ?? DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE) }));
    return goal;
  };

  const handleDeleteGoal = async (goalId: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    if (user?.uid) {
      try {
        await goalsApi.delete(goalId);
      } catch {
        // ignore delete errors silently for now
      }
    }
  };

  const belongsToGroup = (goal: Goal, group: GroupView) => {
    if (groupingMode === "day") {
      return group.dateKey === toDateKey(goal.createdAt);
    }
    return goal.groupId === group.groupId;
  };

  const toggleGoal = (goalId: string) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, completed: !g.completed, completedAt: g.completed ? undefined : new Date().toISOString() }
          : g,
      ),
    );
  };

  const reorderGoal = (group: GroupView, fromId: string, toId: string) => {
    if (fromId === toId) {return;}
    setGoals((prev) => {
      const inGroup = prev.filter((g) => belongsToGroup(g, group));
      const others = prev.filter((g) => !belongsToGroup(g, group));
      const fromIndex = inGroup.findIndex((g) => g.id === fromId);
      const toIndex = inGroup.findIndex((g) => g.id === toId);
      if (fromIndex === -1 || toIndex === -1) {return prev;}
      const reordered = arrayMove(inGroup, fromIndex, toIndex).map((g, idx) => ({ ...g, order: idx }));
      return [...reordered, ...others];
    });
  };

  const handleLoadMore = useCallback(
    (groupId: string) => {
      setVisibleGoalCount((prev) => ({
        ...prev,
        [groupId]: Math.min((prev[groupId] ?? DEFAULT_PAGE_SIZE) + 4, groupedGoals.find((g) => g.id === groupId)?.goals.length ?? DEFAULT_PAGE_SIZE),
      }));
    },
    [groupedGoals],
  );

  const moveGoalToGroup = useCallback(
    (goalId: string, targetGroupId: string, targetGroupName: string) => {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? { ...g, groupId: targetGroupId, groupName: targetGroupName, order: Date.now() }
            : g,
        ),
      );
      setExpandedGroupId(targetGroupId);
    },
    [setGoals],
  );

  const toggleLock = useCallback(
    (goalId: string) => {
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goalId) {return g;}
          if (g.createdBy && g.createdBy !== currentUserId) {return g;}
          return { ...g, locked: !g.locked };
        }),
      );
    },
    [currentUserId, setGoals],
  );

  const expandedOrInitial = useMemo(
    () => expandedGroupId ?? groupedGoals[0]?.id ?? null,
    [expandedGroupId, groupedGoals],
  );

  return (
    <div className="space-y-4 pb-20 mt-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-blue-600 flex items-center gap-2">
            <IconSparkles size={16} /> Clockit Goals
          </p>
          <h1 className="text-3xl font-bold text-[var(--text)]">Create goals to track</h1>
          {!user && (
            <p className="text-xs text-amber-600 mt-1">
              Not signed in — goals and sessions will be kept in your browser (localStorage).
            </p>
          )}
          {user && goals.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              No goals found for your account yet. Create a goal below to start a group.
            </p>
          )}
          {!user && effectiveUsingSampleGoals && (
            <p className="text-xs text-slate-300 mt-1">
              Showing sample goals for browsing. They stay local until you sign in.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All" },
            { key: "daily", label: "Daily groups" },
            { key: "custom", label: "Custom" },
            { key: "examples", label: "View example" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewTab(key as typeof viewTab)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                viewTab === key
                  ? "bg-[var(--primary)] text-[var(--primary-contrast)] border-[var(--primary)]"
                  : "bg-[var(--card-soft)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <IconInfoCircle size={14} className="text-slate-400" />
          Groups allow you to categorize goals beyond just daily buckets. Create a custom group and select it when adding a goal.
        </div>
        <div className="flex flex-col gap-2">
          <div className="relative w-full">
            <IconSearch size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="search"
              placeholder="Search goals or groups"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--text)] placeholder:text-slate-400 focus:outline-none focus:border-[var(--text)]/40"
            />
          </div>
        </div>
      </div>

      {!goalsEnabled ? (
        <div className="border border-[var(--border)] rounded-2xl bg-[var(--card)] p-6 text-center text-[var(--muted)] opacity-65">
          Goals are disabled for your account. Contact support to enable the Clockit Goals feature.
        </div>
      ) : groupedGoals.length === 0 ? (
        <div className="border border-[var(--border)] rounded-2xl bg-[var(--card)] p-6 text-center text-[var(--muted)] opacity-65">
          No goals yet. Add one from the input card below to populate today&apos;s accordion.
        </div>
      ) : (
        groupedGoals.map((group) => (
          <GoalGroupCard
            key={group.id}
            group={group}
            expanded={(expandedOrInitial) === group.id}
            visibleCount={visibleGoalCount[group.id] ?? Math.min(DEFAULT_PAGE_SIZE, group.goals.length || DEFAULT_PAGE_SIZE)}
            hasMore={(group.goals?.length || 0) > (visibleGoalCount[group.id] ?? DEFAULT_PAGE_SIZE)}
            onToggle={() => handleGroupToggle(group.id, "toggle")}
            onCollapse={() => handleGroupToggle(group.id, "collapse")}
            onStart={() => onStartClockit(group)}
            onLoadMore={() => handleLoadMore(group.id)}
            onToggleGoal={(goalId) => toggleGoal(goalId)}
            onDeleteGoal={handleDeleteGoal}
            onDrop={(fromId, toId) => reorderGoal(group, fromId, toId)}
            onMove={moveGoalToGroup}
            allGroups={moveTargets}
            onToggleLock={toggleLock}
            currentUserId={currentUserId}
            draggingId={draggingId}
            setDraggingId={setDraggingId}
          />
        ))
      )}

      {goalsEnabled && (
        <QuickAddGoal
          visible={showQuickAdd}
          user={user}
          customGroups={customGroups}
          onCreateGoal={handleCreateGoal}
          onCreateGroup={handleCreateGroup}
          showCreateGroup
          sessionLayout={false}
        />
      )}
    </div>
  );
}
