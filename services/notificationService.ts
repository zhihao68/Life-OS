import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { planReminders } from '../utils/reminderPlan';
import type { Task } from '../types';

export { taskFireDate, planReminders } from '../utils/reminderPlan';
export { parseLocalDateTime, parseReminderAt, parseReminderOffset } from '../utils/reminderTime';

const supported = Platform.OS !== 'web';
export const REMINDER_CHANNEL_ID = 'lifeos-reminders';

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

/**
 * Android 8+ 必须显式建立通知渠道，否则提醒可能被系统降级为「静默通知」，
 * 不会以横幅形式弹出。这里建一个高优先级渠道并在调度时引用它。
 */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: '任务提醒',
      description: 'Life OS 中任务到点时的提醒通知',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: true,
      showBadge: true,
    });
  } catch (error) {
    console.warn('[notifications] channel setup failed:', error);
  }
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

/**
 * 依据任务列表同步本地提醒：
 * - 只为「今天到期、未完成、时间未过」的任务安排通知（判定逻辑抽在 planReminders，可无头验证）
 * - 每次全量重排（先取消全部），保证与当前任务状态一致
 * 返回实际排定的通知数量。
 */
export async function syncTaskReminders(tasks: Task[], today: string): Promise<number> {
  if (!supported) return 0;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return 0;
    await ensureAndroidChannel();
    await Notifications.cancelAllScheduledNotificationsAsync();

    const reminders = planReminders(tasks, today);
    for (const reminder of reminders) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          sound: 'default',
          data: { taskId: reminder.taskId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.fireAt,
          channelId: REMINDER_CHANNEL_ID,
        } as Notifications.DateTriggerInput,
      });
    }
    return reminders.length;
  } catch (error) {
    console.warn('[notifications] schedule failed:', error);
    return 0;
  }
}

export type ScheduledReminder = { id: string; body: string; fireAt: string };

/** 读取系统里当前真正排定的提醒，用于在应用内自检「提醒到底有没有排上」 */
export async function getScheduledReminders(): Promise<ScheduledReminder[]> {
  if (!supported) return [];
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled
      .map((item) => {
        const trigger = item.trigger as { value?: number } | null;
        const fireAt = trigger && typeof trigger.value === 'number' ? new Date(trigger.value) : null;
        return { id: item.identifier, body: item.content.body ?? '', fireAt: fireAt ? fireAt.toLocaleString() : '未知时间' };
      })
      .sort((a, b) => a.fireAt.localeCompare(b.fireAt));
  } catch (error) {
    console.warn('[notifications] read scheduled failed:', error);
    return [];
  }
}

/** 订阅「点击通知」事件，返回取消订阅函数；点通知时把 taskId 交给上层跳转 */
export function subscribeToNotificationTap(handler: (taskId: string | null) => void): (() => void) | null {
  if (!supported) return null;
  try {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { taskId?: string } | undefined;
      handler(data?.taskId ?? null);
    });
    return () => subscription.remove();
  } catch (error) {
    console.warn('[notifications] subscribe failed:', error);
    return null;
  }
}

/** 立即发一条通知，用于验证通知权限与渠道是否真的打通 */
export async function sendTestNotification(): Promise<boolean> {
  if (!supported) return false;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return false;
    await ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Life OS 通知测试',
        body: '如果你看到这条通知，说明提醒功能已生效。',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        channelId: REMINDER_CHANNEL_ID,
      } as Notifications.TimeIntervalTriggerInput,
    });
    return true;
  } catch (error) {
    console.warn('[notifications] test failed:', error);
    return false;
  }
}
