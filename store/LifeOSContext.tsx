import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { seedState } from '../data/seed';
import { generatePlan as generateAIPlan } from '../services/aiService';
import { localDatabase } from '../services/storage';
import { notificationsSupported, requestNotificationPermission, syncTaskReminders } from '../services/notificationService';
import { createRecurringInstance } from '../utils/recurrence';
import type { AIPlan, LifeOSState, RecurringTask, Task } from '../types';

function localDateNow(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function addMonths(dateStr: string, months: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * 每日滚动：为已启用且 nextRun 已到期的周期任务补齐今天的实例，并把 nextRun 推进到未来。
 * 只在「从本地存储恢复」的数据上执行，避免种子数据重复生成。
 */
function rollRecurringInstances(state: LifeOSState, today: string): LifeOSState {
  const tasks = [...state.tasks];
  let changed = false;
  const recurring = state.recurringTasks.map((item) => {
    if (!item.enabled || item.nextRun > today) return item;
    changed = true;
    const instanceId = `${item.id}-${today}`;
    if (!tasks.some((task) => task.id === instanceId)) {
      tasks.push(createRecurringInstance(item, today));
    }
    if (item.schedule === 'monthly') {
      let next = addMonths(item.nextRun, 1);
      while (next <= today) next = addMonths(next, 1);
      return { ...item, nextRun: next };
    }
    const stepDays = item.schedule === 'weekly' ? 7 : 1;
    let next = addDays(item.nextRun, stepDays);
    while (next <= today) next = addDays(next, stepDays);
    return { ...item, nextRun: next };
  });
  return changed ? { ...state, recurringTasks: recurring, tasks } : state;
}

type LifeOSStore = {
  state: LifeOSState;
  isGenerating: boolean;
  hydrated: boolean;
  toggleTask: (id: string) => void;
  generatePlan: (input: string) => Promise<void>;
  applyPlan: (plan: AIPlan) => void;
  clearPlan: () => void;
};

const Context = createContext<LifeOSStore | null>(null);

export function LifeOSProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LifeOSState>(seedState);
  const [hydrated, setHydrated] = useState(false);
  const [isGenerating, setGenerating] = useState(false);
  const skipPersist = useRef(true);

  // 启动水合：优先本地存储，其次种子数据；随后开启持久化
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = localDateNow();
      const stored = await localDatabase.load();
      if (cancelled) return;
      const restored = stored ? rollRecurringInstances(stored, today) : seedState;
      setState(restored);
      skipPersist.current = false;
      setHydrated(true);
      if (notificationsSupported()) {
        const granted = await requestNotificationPermission();
        if (granted) syncTaskReminders(restored.tasks, today);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 状态变化即落盘；水合完成前不写入
  useEffect(() => {
    if (skipPersist.current) return;
    localDatabase.save(state);
  }, [state]);

  // 任务列表变化后重排今天的通知
  useEffect(() => {
    if (!hydrated) return;
    syncTaskReminders(state.tasks, localDateNow());
  }, [state.tasks, hydrated]);

  const toggleTask = (id: string) =>
    setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, status: task.status === 'done' ? 'todo' : 'done' } : task) }));

  const generatePlan = async (input: string) => {
    setGenerating(true);
    try {
      const plan = await generateAIPlan(input, state);
      setState((current) => ({ ...current, lastAIPlan: plan }));
    } finally {
      setGenerating(false);
    }
  };

  const applyPlan = (plan: AIPlan) =>
    setState((current) => {
      const today = localDateNow();
      const existing = [...current.tasks];
      const recurring = [...current.recurringTasks];
      plan.actions.filter((action) => action.tool === 'createTask').forEach((action) => {
        const match = existing.find((task) => task.title === action.title && task.dueDate === today);
        if (match) {
          match.time = action.time;
          match.kind = 'ai-generated';
          match.sourceActionId = action.id;
        } else {
          existing.push({ id: `task-${plan.id}-${action.id}`, title: action.title, time: action.time, dueDate: today, status: 'todo', kind: 'ai-generated', category: action.category, sourceActionId: action.id });
        }
      });
      plan.actions.filter((action) => action.tool === 'createRecurringTask').forEach((action) => {
        if (!recurring.some((task) => task.title === action.title)) {
          const item: RecurringTask = { id: `rec-${plan.id}-${action.id}`, title: action.title, schedule: action.title === '交房租' ? 'monthly' : 'weekly', scheduleLabel: action.title === '交房租' ? '每月 1 日' : '每周六', time: action.time ?? '10:00', nextRun: today, enabled: true };
          recurring.push(item);
          existing.push(createRecurringInstance(item));
        }
      });
      return { ...current, tasks: existing, recurringTasks: recurring, lastAIPlan: undefined };
    });

  const value = useMemo(() => ({
    state,
    isGenerating,
    hydrated,
    toggleTask,
    generatePlan,
    applyPlan,
    clearPlan: () => setState((current) => ({ ...current, lastAIPlan: undefined })),
  }), [state, isGenerating, hydrated]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLifeOS() {
  const value = useContext(Context);
  if (!value) throw new Error('useLifeOS must be used inside LifeOSProvider');
  return value;
}
