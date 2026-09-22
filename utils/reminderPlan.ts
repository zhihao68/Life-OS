import type { Task } from '../types';
import { parseLocalDateTime, parseReminderAt, parseReminderOffset } from './reminderTime';

export type PlannedReminder = {
  taskId: string;
  title: string;
  body: string;
  fireAt: Date;
};

/** 计算某个任务应当触发的提醒时间：优先显式 reminderAt，否则「任务时间 − 提前分钟数」 */
export function taskFireDate(task: Task): Date | null {
  const explicit = parseReminderAt(task.reminderAt);
  if (explicit) return explicit;
  if (!task.time) return null;
  const base = parseLocalDateTime(task.dueDate, task.time);
  if (!base) return null;
  base.setMinutes(base.getMinutes() - parseReminderOffset(task));
  return base;
}

/**
 * 纯函数：决定「现在应该把哪些任务排进系统通知」。
 * 规则：今天到期、未完成、提醒时间在未来 1 秒之后；按触发时间升序返回。
 * 抽成纯函数是为了能脱离真机做无头验证（见 scripts/logic-check）。
 */
export function planReminders(tasks: Task[], today: string, now: Date = new Date()): PlannedReminder[] {
  return tasks
    .filter((task) => task.status === 'todo' && task.dueDate === today)
    .map((task) => {
      const fireAt = taskFireDate(task);
      if (!fireAt || fireAt.getTime() <= now.getTime() + 1000) return null;
      const body = task.reminder ? `${task.title}（${task.reminder}）` : task.title;
      return { taskId: task.id, title: 'Life OS 提醒', body, fireAt };
    })
    .filter((item): item is PlannedReminder => item !== null)
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}
