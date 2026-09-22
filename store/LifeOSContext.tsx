import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { seedState } from '../data/seed';
import { generatePlan as generateAIPlan } from '../services/aiService';
import { localDatabase } from '../services/storage';
import { notificationsSupported, requestNotificationPermission, syncTaskReminders } from '../services/notificationService';
import { createRecurringInstance } from '../utils/recurrence';
import type { AIPlan, LifeOSState, Note, RecurringTask, Task, WeightEntry, Workout, WorkoutDay, WorkoutSet } from '../types';

function localDateNow(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

function addMonths(dateStr: string, months: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

function timeNow(): string {
  const now = new Date();
  return `${`${now.getHours()}`.padStart(2, '0')}:${`${now.getMinutes()}`.padStart(2, '0')}`;
}

function nowLabel(): string {
  const now = new Date();
  return `${now.getMonth() + 1}月${now.getDate()}日 ${`${now.getHours()}`.padStart(2, '0')}:${`${now.getMinutes()}`.padStart(2, '0')}`;
}

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/** 每日滚动：为已启用且到期的周期任务补齐今天实例，并推进 nextRun */
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

/** 兼容旧版本存档：补齐后续新增的数据结构 */
function migrateState(state: LifeOSState): LifeOSState {
  return {
    ...state,
    weights: state.weights ?? [],
    notes: state.notes.map((note) => ({ ...note, createdAt: note.createdAt ?? localDateNow() })),
    workoutPlan: {
      ...state.workoutPlan,
      days: (state.workoutPlan?.days ?? []).map((day, index) => ({ ...day, id: day.id ?? `wd-${index + 1}` })),
    },
    workouts: (state.workouts ?? []).map((workout) => ({
      ...workout,
      sets: (workout.sets ?? []).map((set, index) => ({ ...set, id: set.id ?? `${workout.id}-set-${index + 1}` })),
    })),
  };
}

type LifeOSStore = {
  state: LifeOSState;
  isGenerating: boolean;
  hydrated: boolean;
  toast: string | null;
  showToast: (message: string) => void;
  toggleTask: (id: string) => void;
  addTask: (title: string, time: string, reminderAt?: string) => void;
  deleteTask: (id: string) => void;
  setTaskReminder: (id: string, reminderAt?: string) => void;
  generatePlan: (input: string) => Promise<void>;
  applyPlan: (plan: AIPlan) => void;
  clearPlan: () => void;
  addNote: (title: string, markdown: string, folder?: string) => string;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addWeight: (date: string, weightKg: number, note?: string) => void;
  updateWeight: (id: string, patch: Partial<WeightEntry>) => void;
  deleteWeight: (id: string) => void;
  addWorkoutDay: (day: string, focus: string) => void;
  updateWorkoutDay: (id: string, patch: Partial<WorkoutDay>) => void;
  removeWorkoutDay: (id: string) => void;
  addExercise: (input: { exercise: string; sets: number; reps: number; weightKg?: number }) => void;
  toggleWorkoutComplete: () => void;
  updateExercise: (id: string, patch: Partial<WorkoutSet>) => void;
  removeExercise: (id: string) => void;
  toggleRecurring: (id: string) => void;
  removeRecurring: (id: string) => void;
};

const Context = createContext<LifeOSStore | null>(null);

export function LifeOSProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LifeOSState>(seedState);
  const [hydrated, setHydrated] = useState(false);
  const [isGenerating, setGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const skipPersist = useRef(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // 启动水合：优先本地存储，其次种子数据；随后开启持久化
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = localDateNow();
      const stored = await localDatabase.load();
      if (cancelled) return;
      const restored = stored ? rollRecurringInstances(migrateState(stored), today) : seedState;
      setState(restored);
      skipPersist.current = false;
      setHydrated(true);
      if (notificationsSupported()) {
        const granted = await requestNotificationPermission();
        if (granted) {
          const count = await syncTaskReminders(restored.tasks, today);
          if (count > 0) showToast(`已为 ${count} 个任务安排提醒`);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [showToast]);

  // 状态变化即落盘；水合完成前不写入
  useEffect(() => {
    if (skipPersist.current) return;
    localDatabase.save(state);
  }, [state]);

  // 任务变化后重排今天的通知
  useEffect(() => {
    if (!hydrated) return;
    syncTaskReminders(state.tasks, localDateNow());
  }, [state.tasks, hydrated]);

  const patchTask = (id: string, patch: Partial<Task>) =>
    setState((current) => ({ ...current, tasks: current.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)) }));

  const toggleTask = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === id ? { ...task, status: task.status === 'done' ? 'todo' : 'done' } : task)),
    }));
  }, []);

  const addTask = useCallback((title: string, time: string, reminderAt?: string) => {
    const today = localDateNow();
    setState((current) => ({
      ...current,
      tasks: [...current.tasks, { id: uid('task'), title, time: time || undefined, dueDate: today, status: 'todo', kind: 'one-off', category: 'life', reminder: reminderAt ? `${reminderAt.slice(11)} 提醒` : undefined, reminderAt }],
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
  }, []);

  const setTaskReminder = useCallback((id: string, reminderAt?: string) => {
    patchTask(id, { reminderAt, reminder: reminderAt ? `${reminderAt.slice(11)} 提醒` : undefined });
  }, []);

  const generatePlan = useCallback(async (input: string) => {
    setGenerating(true);
    try {
      const plan = await generateAIPlan(input, state);
      setState((current) => ({ ...current, lastAIPlan: plan }));
    } finally {
      setGenerating(false);
    }
  }, [state]);

  const applyPlan = useCallback((plan: AIPlan) => {
    setState((current) => {
      const today = localDateNow();
      const existing = [...current.tasks];
      const recurring = [...current.recurringTasks];
      const notes = [...current.notes];
      const events = [...current.timelineEvents];

      plan.actions.filter((action) => action.tool === 'createTask').forEach((action) => {
        const match = existing.find((task) => task.title === action.title && task.dueDate === today);
        if (match) {
          match.time = action.time;
          match.kind = 'ai-generated';
          match.sourceActionId = action.id;
          return;
        }
        existing.push({ id: `task-${plan.id}-${action.id}`, title: action.title, time: action.time, dueDate: today, status: 'todo', kind: 'ai-generated', category: action.category, sourceActionId: action.id });
        events.push({ id: `event-${plan.id}-${action.id}`, date: today, time: action.time ?? '09:00', title: action.title, detail: 'AI 生成的任务', type: 'ai' });
      });

      plan.actions.filter((action) => action.tool === 'createRecurringTask').forEach((action) => {
        if (recurring.some((task) => task.title === action.title)) return;
        const monthly = /每月|房租/.test(`${action.title} ${action.explanation}`);
        const item: RecurringTask = {
          id: `rec-${plan.id}-${action.id}`,
          title: action.title,
          schedule: monthly ? 'monthly' : 'weekly',
          scheduleLabel: monthly ? '每月 1 日' : '每周',
          time: action.time ?? '10:00',
          nextRun: today,
          enabled: true,
        };
        recurring.push(item);
        existing.push(createRecurringInstance(item));
      });

      plan.actions.filter((action) => action.tool === 'createNote').forEach((action) => {
        if (notes.some((note) => note.title === action.title)) return;
        const markdown = action.content?.trim() || `# ${action.title}\n\n${plan.input}`;
        notes.push({ id: `note-${plan.id}-${action.id}`, title: action.title, markdown, folder: '收集箱', tags: ['AI'], updatedAt: nowLabel(), createdAt: today, linkedNoteIds: [], relatedTaskIds: [] });
        events.push({ id: `event-note-${plan.id}-${action.id}`, date: today, time: '09:00', title: action.title, detail: 'AI 创建的笔记', type: 'note' });
      });

      return { ...current, tasks: existing, recurringTasks: recurring, notes, timelineEvents: events, lastAIPlan: undefined };
    });
  }, []);

  const addNote = useCallback((title: string, markdown: string, folder = '收集箱') => {
    const id = uid('note');
    setState((current) => ({
      ...current,
      notes: [{ id, title: title || '未命名笔记', markdown, folder, tags: [], updatedAt: nowLabel(), createdAt: localDateNow(), linkedNoteIds: [], relatedTaskIds: [] }, ...current.notes],
    }));
    return id;
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setState((current) => ({
      ...current,
      notes: current.notes.map((note) => (note.id === id ? { ...note, ...patch, updatedAt: nowLabel() } : note)),
    }));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setState((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== id) }));
  }, []);

  const addWeight = useCallback((date: string, weightKg: number, note?: string) => {
    setState((current) => {
      const others = current.weights.filter((entry) => entry.date !== date);
      return { ...current, weights: [...others, { id: uid('weight'), date, weightKg, note }].sort((a, b) => a.date.localeCompare(b.date)) };
    });
  }, []);

  const updateWeight = useCallback((id: string, patch: Partial<WeightEntry>) => {
    setState((current) => ({ ...current, weights: current.weights.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)).sort((a, b) => a.date.localeCompare(b.date)) }));
  }, []);

  const deleteWeight = useCallback((id: string) => {
    setState((current) => ({ ...current, weights: current.weights.filter((entry) => entry.id !== id) }));
  }, []);

  const addWorkoutDay = useCallback((day: string, focus: string) => {
    setState((current) => ({ ...current, workoutPlan: { ...current.workoutPlan, days: [...current.workoutPlan.days, { id: uid('wd'), day, focus, isRest: /休息|休/.test(focus) }] } }));
  }, []);

  const updateWorkoutDay = useCallback((id: string, patch: Partial<WorkoutDay>) => {
    setState((current) => ({ ...current, workoutPlan: { ...current.workoutPlan, days: current.workoutPlan.days.map((item) => (item.id === id ? { ...item, ...patch } : item)) } }));
  }, []);

  const removeWorkoutDay = useCallback((id: string) => {
    setState((current) => ({ ...current, workoutPlan: { ...current.workoutPlan, days: current.workoutPlan.days.filter((item) => item.id !== id) } }));
  }, []);

  const patchExercises = (updater: (sets: WorkoutSet[]) => WorkoutSet[]) =>
    setState((current) => {
      const workouts = [...current.workouts];
      const target: Workout = workouts[0] ?? { id: uid('workout'), date: localDateNow(), focus: current.workoutPlan.days[0]?.focus ?? '训练', durationMin: 60, sets: [], completed: false };
      const updated: Workout = { ...target, sets: updater(target.sets ?? []) };
      workouts[0] = updated;
      return { ...current, workouts };
    });

  const addExercise = useCallback((input: { exercise: string; sets: number; reps: number; weightKg?: number }) => {
    patchExercises((sets) => [...sets, { id: uid('set'), ...input }]);
  }, []);

  const updateExercise = useCallback((id: string, patch: Partial<WorkoutSet>) => {
    patchExercises((sets) => sets.map((set) => (set.id === id ? { ...set, ...patch } : set)));
  }, []);

  const removeExercise = useCallback((id: string) => {
    patchExercises((sets) => sets.filter((set) => set.id !== id));
  }, []);

  const toggleWorkoutComplete = useCallback(() => {
    setState((current) => {
      const today = localDateNow();
      const workouts = [...current.workouts];
      const target: Workout = workouts[0] ?? { id: uid('workout'), date: today, focus: current.workoutPlan.days[0]?.focus ?? '训练', durationMin: 60, sets: [], completed: false };
      const completed = !target.completed;
      workouts[0] = { ...target, completed };
      const events = [...current.timelineEvents];
      if (completed && !events.some((event) => event.id === `event-${target.id}-done`)) {
        events.push({ id: `event-${target.id}-done`, date: today, time: timeNow(), title: `${target.focus} 训练完成`, detail: `${target.durationMin} 分钟`, type: 'workout' });
      }
      return { ...current, workouts, timelineEvents: events };
    });
  }, []);

  const toggleRecurring = useCallback((id: string) => {
    setState((current) => ({ ...current, recurringTasks: current.recurringTasks.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)) }));
  }, []);

  const removeRecurring = useCallback((id: string) => {
    setState((current) => ({ ...current, recurringTasks: current.recurringTasks.filter((item) => item.id !== id) }));
  }, []);

  const value = useMemo(() => ({
    state,
    isGenerating,
    hydrated,
    toast,
    showToast,
    toggleTask,
    addTask,
    deleteTask,
    setTaskReminder,
    generatePlan,
    applyPlan,
    clearPlan: () => setState((current) => ({ ...current, lastAIPlan: undefined })),
    addNote,
    updateNote,
    deleteNote,
    addWeight,
    updateWeight,
    deleteWeight,
    addWorkoutDay,
    updateWorkoutDay,
    removeWorkoutDay,
    addExercise,
    toggleWorkoutComplete,
    updateExercise,
    removeExercise,
    toggleRecurring,
    removeRecurring,
  }), [state, isGenerating, hydrated, toast, showToast, toggleTask, addTask, deleteTask, setTaskReminder, generatePlan, applyPlan, addNote, updateNote, deleteNote, addWeight, updateWeight, deleteWeight, addWorkoutDay, updateWorkoutDay, removeWorkoutDay, addExercise, toggleWorkoutComplete, updateExercise, removeExercise, toggleRecurring, removeRecurring]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLifeOS() {
  const value = useContext(Context);
  if (!value) throw new Error('useLifeOS must be used inside LifeOSProvider');
  return value;
}

type Navigation = { tab: 'today' | 'timeline' | 'notes' | 'fitness' | 'review'; go: (tab: 'today' | 'timeline' | 'notes' | 'fitness' | 'review') => void };
const NavContext = createContext<Navigation | null>(null);

export function NavigationProvider({ tab, go, children }: { tab: Navigation['tab']; go: Navigation['go']; children: React.ReactNode }) {
  const value = useMemo(() => ({ tab, go }), [tab, go]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNavigation(): Navigation {
  const value = useContext(NavContext);
  if (!value) throw new Error('useNavigation must be used inside NavigationProvider');
  return value;
}
