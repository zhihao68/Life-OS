import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Task } from '../types';

const supported = Platform.OS !== 'web';

// 前台也弹出提醒（真机才生效；Web 环境下该模块整体降级为空操作）
if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export function notificationsSupported(): boolean {
  return supported;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
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

/** 把 'YYYY-MM-DDTHH:mm' 或 {日期, 时间} 转成本地 Date */
export function parseLocalDateTime(day: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{1,2}:\d{2}$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function parseReminderAt(value?: string): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{1,2}:\d{2})$/);
  if (!match) return null;
  return parseLocalDateTime(match[1], match[2]);
}

export function parseReminderOffset(task: Task): number {
  // reminder 形如 "提前 10 分钟"；解析失败默认准时提醒
  const match = task.reminder?.match(/(\d+)\s*分钟/);
  return match ? Number(match[1]) : 0;
}

/** 计算某个任务应该触发的提醒时间：优先用显式 reminderAt，否则用「任务时间 - 提前分钟数」 */
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
 * 依据任务列表同步本地提醒：
 * - 只为「今天到期、未完成、时间未过」的任务安排通知
 * - 每次全量重排（先取消全部），保证与当前任务状态一致
 * 返回实际排定的通知数量。
 */
export async function syncTaskReminders(tasks: Task[], today: string): Promise<number> {
  if (!supported) return 0;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return 0;
    await Notifications.cancelAllScheduledNotificationsAsync();
    let scheduled = 0;
    for (const task of tasks) {
      if (task.status !== 'todo' || task.dueDate !== today) continue;
      const fireDate = taskFireDate(task);
      if (!fireDate || fireDate.getTime() <= Date.now() + 1000) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Life OS 提醒',
          body: task.reminder ? `${task.title}（${task.reminder}）` : task.title,
          sound: 'default',
          data: { taskId: task.id },
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

/** 立即发一条通知，用于验证通知权限是否真的打通 */
export async function sendTestNotification(): Promise<boolean> {
  if (!supported) return false;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return false;
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Life OS 通知测试', body: '如果你看到这条通知，说明提醒功能已生效。', sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 } as Notifications.TimeIntervalTriggerInput,
    });
    return true;
  } catch (error) {
    console.warn('[notifications] test failed:', error);
    return false;
  }
}
