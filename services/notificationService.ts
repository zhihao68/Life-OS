import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Task } from '../types';

export function notificationsSupported(): boolean {
  return Platform.OS !== 'web' && Notifications?.scheduleNotificationAsync !== undefined;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    if (settings.status === Notifications.PermissionStatus.UNDETERMINED) {
      const request = await Notifications.requestPermissionsAsync();
      return request.granted;
    }
    return false;
  } catch (error) {
    console.warn('[notifications] permission request failed:', error);
    return false;
  }
}

function parseReminderMinutes(task: Task): number {
  // reminder 形如 "提前 10 分钟"；解析提前分钟数，解析失败默认准时提醒
  const match = task.reminder?.match(/(\d+)\s*分钟/);
  return match ? Number(match[1]) : 0;
}

function taskFireDate(task: Task): Date | null {
  const [hours, minutes] = (task.time ?? '09:00').split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const fire = new Date(`${task.dueDate}T00:00:00`);
  if (Number.isNaN(fire.getTime())) return null;
  fire.setHours(hours, minutes - parseReminderMinutes(task), 0, 0);
  return fire;
}

/**
 * 依据任务列表同步本地提醒：
 * - 只为「今天到期、未完成、带时间」的任务安排通知
 * - 每次全量重排（先取消全部），保证与当前任务状态一致
 */
export async function syncTaskReminders(tasks: Task[], today: string): Promise<number> {
  if (!notificationsSupported()) return 0;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    let scheduled = 0;
    for (const task of tasks) {
      if (task.status !== 'todo' || task.dueDate !== today || !task.time) continue;
      const fireDate = taskFireDate(task);
      if (!fireDate || fireDate.getTime() <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Life OS 提醒',
          body: task.reminder ? `${task.title}（${task.reminder}）` : task.title,
          sound: 'default',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate } as Notifications.DateTriggerInput,
      });
      scheduled += 1;
    }
    return scheduled;
  } catch (error) {
    console.warn('[notifications] schedule failed:', error);
    return 0;
  }
}
