import type { Task } from '../types';

export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function localDateNow(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

export function dateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return `${date.getMonth() + 1}月${date.getDate()}日 · 星期${WEEKDAYS[date.getDay()]}`;
}

export function timeNowLabel(): string {
  const now = new Date();
  return `${`${now.getHours()}`.padStart(2, '0')}:${`${now.getMinutes()}`.padStart(2, '0')}`;
}

export function minutesFromTime(time: string): number | null {
  if (!/^\d{1,2}:\d{2}$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function timeFromMinutes(total: number): string {
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${`${Math.floor(normalized / 60)}`.padStart(2, '0')}:${`${normalized % 60}`.padStart(2, '0')}`;
}

/** 由「任务日期 + 任务时间 - 提前分钟数」得到提醒时间（YYYY-MM-DDTHH:mm） */
export function reminderAtFor(task: Task, offsetMinutes: number): string | null {
  const base = task.time ? minutesFromTime(task.time) : 9 * 60;
  if (base === null) return null;
  return `${task.dueDate}T${timeFromMinutes(base - offsetMinutes)}`;
}

export function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}
