import type { Ionicons } from '@expo/vector-icons';

export type Tab = 'today' | 'timeline' | 'notes' | 'fitness' | 'review';
export type IconName = keyof typeof Ionicons.glyphMap;
export type Task = { id: string; title: string; time?: string; dueDate: string; status: 'todo' | 'done' | 'delayed'; kind: 'one-off' | 'recurring-instance' | 'ai-generated'; category: 'work' | 'fitness' | 'learning' | 'life' | 'note'; reminder?: string; sourceActionId?: string };
export type RecurringTask = { id: string; title: string; schedule: 'daily' | 'weekly' | 'monthly' | 'custom'; scheduleLabel: string; time: string; nextRun: string; enabled: boolean };
export type Note = { id: string; title: string; markdown: string; folder: string; tags: string[]; updatedAt: string; pinned?: boolean; linkedNoteIds: string[]; relatedTaskIds: string[] };
export type WorkoutPlan = { id: string; weekLabel: string; days: { day: string; focus: string; isRest?: boolean }[] };
export type WorkoutSet = { exercise: string; weightKg?: number; reps: number; sets: number };
export type Workout = { id: string; date: string; focus: string; durationMin: number; sets: WorkoutSet[]; completed: boolean };
export type TimelineEvent = { id: string; date: string; time: string; title: string; type: 'task' | 'workout' | 'note' | 'journal' | 'ai'; detail: string; linkedTaskId?: string };
export type ReviewMetrics = { taskCompletionRate: number; recurringCompletionRate: number; fitnessCompletionRate: number; learningHours: number; noteCount: number; delayedTaskCount: number; focusHours: number };
export type AIAction = { id: string; tool: 'createTask' | 'createRecurringTask' | 'createReminder' | 'createNote' | 'createWorkoutPlan'; title: string; time?: string; category: Task['category']; explanation: string; requiresConfirmation: boolean };
export type AIPlan = { id: string; input: string; summary: string; actions: AIAction[]; createdAt: string };
export type LifeOSState = { tasks: Task[]; recurringTasks: RecurringTask[]; notes: Note[]; workoutPlan: WorkoutPlan; workouts: Workout[]; timelineEvents: TimelineEvent[]; lastAIPlan?: AIPlan };
