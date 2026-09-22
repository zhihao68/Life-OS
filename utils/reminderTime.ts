import type { Task } from '../types';

/** 把 'YYYY-MM-DD' + 'HH:mm' 转成本地时区 Date（不依赖 RN，便于无头验证） */
export function parseLocalDateTime(day: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{1,2}:\d{2}$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/** 解析任务上显式设置的提醒时间 'YYYY-MM-DDTHH:mm' */
export function parseReminderAt(value?: string): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{1,2}:\d{2})$/);
  if (!match) return null;
  return parseLocalDateTime(match[1], match[2]);
}

/** 解析 reminder 文案里的提前分钟数（如「提前 10 分钟」），解析失败视为准时提醒 */
export function parseReminderOffset(task: Task): number {
  const match = task.reminder?.match(/(\d+)\s*分钟/);
  return match ? Number(match[1]) : 0;
}
