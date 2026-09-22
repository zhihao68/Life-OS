import React, { useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLifeOS, useNavigation } from '../store/LifeOSContext';
import { Card, Chip, Field, GhostButton, colors, Header, PrimaryButton, Screen, SectionHeader, Sheet, shadow } from '../components/ui';
import { getScheduledReminders, sendTestNotification, syncTaskReminders, type ScheduledReminder } from '../services/notificationService';
import { dateLabel, localDateNow, reminderAtFor, timeNowLabel } from '../utils/datetime';
import type { AIPlan, Task } from '../types';

const REMINDER_PRESETS: { label: string; offset: number }[] = [
  { label: '准时', offset: 0 },
  { label: '提前 10 分钟', offset: 10 },
  { label: '提前 30 分钟', offset: 30 },
  { label: '提前 1 小时', offset: 60 },
];

export function TodayScreen() {
  const { state, toggleTask, deleteTask, setTaskReminder, addTask, generatePlan, applyPlan, clearPlan, isGenerating, toggleRecurring, removeRecurring, showToast } = useLifeOS();
  const { go } = useNavigation();
  const [input, setInput] = useState('');
  const [taskSheet, setTaskSheet] = useState(false);
  const [settingsSheet, setSettingsSheet] = useState(false);
  const [recurringSheet, setRecurringSheet] = useState(false);
  const [reminderTask, setReminderTask] = useState<Task | null>(null);
  const [customReminder, setCustomReminder] = useState('');
  const [remindersSheet, setRemindersSheet] = useState(false);
  const [scheduled, setScheduled] = useState<ScheduledReminder[] | null>(null);
  const [draft, setDraft] = useState({ title: '', time: '', reminder: '' });

  const today = localDateNow();
  const todayTasks = state.tasks.filter((task) => task.dueDate === today || task.kind === 'ai-generated');
  const completed = todayTasks.filter((task) => task.status === 'done').length;
  const progress = todayTasks.length ? Math.round((completed / todayTasks.length) * 100) : 0;
  const important = todayTasks.find((task) => task.status !== 'done') ?? todayTasks[0];

  const submit = async () => {
    if (!input.trim()) return;
    await generatePlan(input);
    setInput('');
  };

  const saveTask = () => {
    if (!draft.title.trim()) {
      showToast('请先填写任务标题');
      return;
    }
    const reminderAt = draft.reminder ? `${today}T${draft.reminder}` : undefined;
    addTask(draft.title.trim(), draft.time.trim(), reminderAt);
    setDraft({ title: '', time: '', reminder: '' });
    setTaskSheet(false);
    showToast('任务已添加到今天');
  };

  const applyReminder = (offset: number | null) => {
    if (!reminderTask) return;
    if (offset === null) {
      setTaskReminder(reminderTask.id, undefined);
      showToast('已取消提醒');
    } else {
      const at = reminderAtFor(reminderTask, offset);
      if (!at) {
        showToast('该任务还没有具体时间，请先设置时间');
        return;
      }
      setTaskReminder(reminderTask.id, at);
      showToast(`提醒已设为 ${at.slice(11)}`);
    }
    setReminderTask(null);
  };

  const applyCustomReminder = () => {
    if (!reminderTask) return;
    const match = customReminder.match(/^(\d{1,2}):(\d{2})$/);
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
      showToast('请按 HH:MM 格式输入提醒时间');
      return;
    }
    const at = `${reminderTask.dueDate}T${`${match[1]}`.padStart(2, '0')}:${match[2]}`;
    setTaskReminder(reminderTask.id, at);
    showToast(`提醒已设为 ${at.slice(11)}`);
    setReminderTask(null);
  };

  const syncTaskRemindersNow = async () => syncTaskReminders(state.tasks, today);

  const openScheduled = async () => {
    setRemindersSheet(true);
    setScheduled(null);
    const list = await getScheduledReminders();
    setScheduled(list);
  };

  const testNotification = async () => {
    const ok = await sendTestNotification();
    showToast(ok ? '已发送测试通知，2 秒后到达（请留在此页面）' : '通知权限未开启，请在系统设置中允许通知');
  };

  return (
    <>
      <Screen
        fab={
          <Pressable onPress={() => setTaskSheet(true)} style={({ pressed }) => [styles.fab, pressed && styles.pressed]} accessibilityLabel="新增任务">
            <Ionicons name="add" size={25} color="#fff" />
          </Pressable>
        }
      >
        <Header title="早上好，志浩 ☀️" subtitle={dateLabel(today)} icon="settings-outline" onAction={() => setSettingsSheet(true)} />

        <View style={styles.hero}>
          <View style={styles.heroAccent}>
            <Ionicons name="sparkles" size={17} color={colors.purple} />
            <Text style={styles.heroEyebrow}>一句话，安排好今天</Text>
          </View>
          <Text style={styles.heroTitle}>把想做的事告诉我，剩下的交给 Life OS</Text>
          <Text style={styles.heroHint}>待办、笔记、提醒和训练会自动整理成可执行计划</Text>
          <View style={styles.input}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={submit}
              placeholder="今天想完成什么？"
              placeholderTextColor="#9EA6B5"
              style={styles.inputText}
              returnKeyType="done"
            />
            <Pressable onPress={submit} style={({ pressed }) => [styles.submit, pressed && styles.pressed]} accessibilityLabel="生成今日计划">
              {isGenerating ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name={input ? 'arrow-up' : 'sparkles'} size={18} color="#fff" />}
            </Pressable>
          </View>
        </View>

        {state.lastAIPlan ? <AIPlanCard plan={state.lastAIPlan} onApply={() => applyPlan(state.lastAIPlan as AIPlan)} onAdjust={clearPlan} onToast={showToast} /> : null}

        <SectionHeader title="今天最重要" action="查看全部任务" onAction={() => setTaskSheet(true)} />
        <Card style={styles.focusCard}>
          <View style={styles.focusIcon}><Ionicons name="flag" size={18} color={colors.purple} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.focusTitle}>{important?.title ?? '从一句话开始安排今天'}</Text>
            <Text style={styles.focusHint}>{important?.time ? `${important.time} · ${important.reminder ?? '未设提醒'}` : '告诉 AI 你想完成什么'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#A9B0BD" />
        </Card>

        <SectionHeader title="今日任务" action={`${completed}/${todayTasks.length} 已完成`} onAction={() => showToast(`今天共 ${todayTasks.length} 项，已完成 ${completed} 项`)} />
        <Card>
          {todayTasks.length ? todayTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => toggleTask(task.id)}
              onRemind={() => setReminderTask(task)}
              onDelete={() => { deleteTask(task.id); showToast('任务已删除'); }}
            />
          )) : <Text style={styles.emptyInline}>今天还没有任务，点右下角加号或告诉 AI 你的计划。</Text>}
        </Card>

        <SectionHeader title="固定事项" action="管理周期任务" onAction={() => setRecurringSheet(true)} />
        <Card>
          {state.recurringTasks.map((task) => (
            <View style={styles.recurring} key={task.id}>
              <View style={styles.recurringIcon}><Ionicons name="repeat" size={16} color={colors.purple} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskHint}>{task.scheduleLabel} · {task.time}</Text>
              </View>
              <Pressable onPress={() => { toggleRecurring(task.id); showToast(task.enabled ? '已暂停该周期任务' : '已开启该周期任务'); }} accessibilityLabel="切换周期任务状态">
                <View style={[styles.enabled, !task.enabled && styles.disabled]}><Text style={[styles.enabledText, !task.enabled && styles.disabledText]}>{task.enabled ? '已开启' : '已暂停'}</Text></View>
              </Pressable>
            </View>
          ))}
        </Card>

        <View style={styles.twoCol}>
          <Pressable style={{ flex: 1 }} onPress={() => go('fitness')} accessibilityLabel="查看训练">
            <Card style={styles.smallCard}>
              <Text style={styles.label}>今日训练</Text>
              <Text style={styles.metric}>{state.workoutPlan.days.find((day) => day.focus && !day.isRest)?.focus ?? '休息'}</Text>
              <Text style={styles.hint}>{state.workouts[0]?.sets.length ?? 0} 个动作 · 预计 60 分钟</Text>
            </Card>
          </Pressable>
          <Card style={[styles.smallCard, styles.progressCard]}>
            <Text style={styles.label}>完成进度</Text>
            <View style={styles.progressRing}><Text style={styles.progressValue}>{progress}%</Text></View>
            <Text style={styles.hint}>{completed} 项已完成</Text>
          </Card>
        </View>

        <SectionHeader title="近期笔记" action="查看全部" onAction={() => go('notes')} />
        <Pressable onPress={() => go('notes')} accessibilityLabel="打开笔记">
          <Card>
            {state.notes.slice(0, 3).map((note) => (
              <View key={note.id} style={styles.noteRow}>
                <Ionicons name="document-text-outline" size={16} color={colors.purple} />
                <Text style={styles.noteTitle}>{note.title}</Text>
                <Text style={styles.noteDate}>{note.updatedAt}</Text>
              </View>
            ))}
          </Card>
        </Pressable>

        <Pressable onPress={testNotification} accessibilityLabel="发送测试通知">
          <View style={styles.insight}>
            <Ionicons name="notifications-outline" size={18} color="#A17B19" />
            <View style={{ flex: 1 }}>
              <Text style={styles.insightTitle}>通知自检</Text>
              <Text style={styles.insightText}>点这里发一条测试通知，确认提醒能在手机上弹出。</Text>
            </View>
          </View>
        </Pressable>
      </Screen>

      {/* 新增任务 */}
      <Sheet
        visible={taskSheet}
        title="新增今日任务"
        onClose={() => setTaskSheet(false)}
        footer={<><GhostButton label="取消" onPress={() => setTaskSheet(false)} /><PrimaryButton label="添加到今天" icon="checkmark" onPress={saveTask} /></>}
      >
        <Field label="任务标题" value={draft.title} onChangeText={(title) => setDraft((prev) => ({ ...prev, title }))} placeholder="例如：修改论文第三章" />
        <Field label="时间（HH:MM，可留空）" value={draft.time} onChangeText={(time) => setDraft((prev) => ({ ...prev, time }))} placeholder="14:00" />
        <Field label="提醒时间（HH:MM，可留空）" value={draft.reminder} onChangeText={(reminder) => setDraft((prev) => ({ ...prev, reminder }))} placeholder="13:50" />
        <Text style={styles.sheetHint}>当前共 {todayTasks.length} 项今日任务</Text>
      </Sheet>

      {/* 设置提醒 */}
      <Sheet visible={Boolean(reminderTask)} title={reminderTask ? `提醒 · ${reminderTask.title}` : '提醒'} onClose={() => setReminderTask(null)}>
        <Text style={styles.sheetHint}>任务时间：{reminderTask?.time ?? '未设置（默认按 09:00 计算）'}</Text>
        <View style={styles.chipRow}>
          {REMINDER_PRESETS.map((preset) => (
            <Chip key={preset.label} label={preset.label} onPress={() => applyReminder(preset.offset)} />
          ))}
        </View>
        <Field label="自定义提醒时间（HH:MM）" value={customReminder} onChangeText={setCustomReminder} placeholder="08:30" />
        <View style={styles.sheetActions}>
          <GhostButton label="取消提醒" icon="notifications-off-outline" tone="danger" onPress={() => applyReminder(null)} />
          <PrimaryButton label="保存提醒" icon="checkmark" onPress={applyCustomReminder} />
        </View>
        <Text style={styles.sheetHint}>提醒会在到点时由系统通知弹出；未完成的今日任务才会保留提醒。</Text>
      </Sheet>

      {/* 周期任务管理 */}
      <Sheet visible={recurringSheet} title="周期任务管理" onClose={() => setRecurringSheet(false)}>
        {state.recurringTasks.length ? state.recurringTasks.map((task) => (
          <View key={task.id} style={styles.manageRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskHint}>{task.scheduleLabel} · {task.time} · {task.enabled ? '已开启' : '已暂停'}</Text>
            </View>
            <GhostButton label={task.enabled ? '暂停' : '开启'} onPress={() => toggleRecurring(task.id)} />
            <GhostButton label="删除" tone="danger" onPress={() => { removeRecurring(task.id); showToast('周期任务已删除'); }} />
          </View>
        )) : <Text style={styles.emptyInline}>还没有周期任务，可以让 AI 帮你创建（例如「每周六浇花」）。</Text>}
      </Sheet>

      {/* 已排定提醒（系统级自检） */}
      <Sheet visible={remindersSheet} title="系统里已排定的提醒" onClose={() => setRemindersSheet(false)}
        footer={<><GhostButton label="刷新" icon="refresh-outline" onPress={openScheduled} /><PrimaryButton label="关闭" onPress={() => setRemindersSheet(false)} /></>}
      >
        {scheduled === null ? <Text style={styles.sheetHint}>正在读取系统通知队列…</Text> : scheduled.length ? scheduled.map((item) => (
          <View key={item.id} style={styles.manageRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>{item.body}</Text>
              <Text style={styles.taskHint}>触发时间：{item.fireAt}</Text>
            </View>
            <Ionicons name="notifications" size={16} color={colors.purple} />
          </View>
        )) : <Text style={styles.sheetHint}>系统队列为空。可能原因：通知权限未开启、任务没有时间、或提醒时间已过。</Text>}
        <Text style={styles.sheetHint}>这里显示的是操作系统里真实存在的待触发通知，用来确认提醒确实排上了（应用重启后仍会保留，关机或强制停止可能被系统清理）。</Text>
      </Sheet>

      {/* 设置 */}
      <Sheet visible={settingsSheet} title="设置与自检" onClose={() => setSettingsSheet(false)}>
        <Text style={styles.settingLine}>任务 {state.tasks.length} 项 · 笔记 {state.notes.length} 篇 · 体重记录 {state.weights.length} 条</Text>
        <View style={styles.sheetActions}>
          <GhostButton label="测试通知" icon="notifications-outline" onPress={testNotification} />
          <GhostButton label="已排定提醒" icon="list-outline" onPress={() => { setSettingsSheet(false); openScheduled(); }} />
        </View>
        <View style={styles.sheetActions}>
          <GhostButton label="去笔记" icon="document-text-outline" onPress={() => { setSettingsSheet(false); go('notes'); }} />
          <GhostButton label="重新排定提醒" icon="refresh-outline" onPress={async () => { const count = await syncTaskRemindersNow(); showToast(count ? `已重新排定 ${count} 条提醒` : '当前没有需要提醒的任务'); }} />
        </View>
        <View style={styles.sheetActions}>
          <GhostButton label="去健身" icon="barbell-outline" onPress={() => { setSettingsSheet(false); go('fitness'); }} />
          <GhostButton label="去总结" icon="shield-checkmark-outline" onPress={() => { setSettingsSheet(false); go('review'); }} />
        </View>
        <Text style={styles.sheetHint}>数据保存在本机（AsyncStorage），关闭应用不会丢失。当前时间 {timeNowLabel()}</Text>
      </Sheet>
    </>
  );
}

function AIPlanCard({ plan, onApply, onAdjust, onToast }: { plan: AIPlan; onApply: () => void; onAdjust: () => void; onToast: (message: string) => void }) {
  const progress = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [progress, plan.id]);
  return (
    <Animated.View style={[styles.planCard, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      <View style={styles.planHead}>
        <View style={styles.aiBadge}><Ionicons name="sparkles" size={15} color={colors.purple} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.planTitle}>AI 已为你安排</Text>
          <Text style={styles.planSummary}>{plan.summary}</Text>
          {plan.note ? <Text style={styles.planNote}>{plan.note}</Text> : null}
        </View>
        <Pressable onPress={onAdjust} accessibilityLabel="关闭计划预览" hitSlop={8}><Ionicons name="close" size={18} color="#A0A8B7" /></Pressable>
      </View>
      {plan.actions.map((action) => (
        <View style={styles.planAction} key={action.id}>
          <View style={styles.planDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.planActionTitle}>{action.title}</Text>
            <Text style={styles.planActionHint}>
              {action.tool === 'createNote' ? '笔记' : (action.time ?? '待安排')} · {action.explanation}
            </Text>
          </View>
          {action.requiresConfirmation ? <Ionicons name="shield-checkmark-outline" size={17} color={colors.warning} /> : null}
        </View>
      ))}
      <View style={styles.planFooter}>
        <Text style={styles.planMeta}>{plan.actions.length} 个安排 · {plan.source === 'local' ? '本地规则' : 'AI 生成'}</Text>
        <PrimaryButton label="应用计划" icon="arrow-forward" onPress={() => { onApply(); onToast('计划已应用，可在任务与笔记中查看'); }} />
      </View>
    </Animated.View>
  );
}

function TaskRow({ task, onToggle, onRemind, onDelete }: { task: Task; onToggle: () => void; onRemind: () => void; onDelete: () => void }) {
  return (
    <View style={styles.taskRow}>
      <Pressable onPress={onToggle} style={({ pressed }) => [styles.taskMain, pressed && styles.pressed]} accessibilityLabel="切换完成状态">
        <View style={[styles.check, task.status === 'done' && styles.checkDone]}>
          {task.status === 'done' ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.taskTitle, task.status === 'done' && styles.done]}>{task.title}</Text>
          <Text style={styles.taskHint}>{task.time ?? '待安排'}{task.reminder ? ` · 🔔 ${task.reminder}` : ''}</Text>
        </View>
      </Pressable>
      <Pressable onPress={onRemind} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} accessibilityLabel="设置提醒" hitSlop={6}>
        <Ionicons name={task.reminderAt ? 'notifications' : 'notifications-outline'} size={17} color={task.reminderAt ? colors.purple : '#A9B0BD'} />
      </Pressable>
      <Pressable onPress={onDelete} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} accessibilityLabel="删除任务" hitSlop={6}>
        <Ionicons name="trash-outline" size={17} color="#C3C9D4" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 17, borderRadius: 19, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, ...shadow },
  heroAccent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroEyebrow: { color: colors.purple, fontSize: 11, fontWeight: '700' },
  heroTitle: { marginTop: 10, color: colors.ink, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  heroHint: { marginTop: 7, color: colors.muted, fontSize: 11, lineHeight: 17 },
  input: { height: 47, marginTop: 14, paddingLeft: 14, paddingRight: 6, borderRadius: 15, backgroundColor: '#F5F6FA', borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputText: { flex: 1, color: colors.ink, fontSize: 13 },
  submit: { width: 35, height: 35, borderRadius: 18, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  focusCard: { minHeight: 68, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  focusIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  focusTitle: { color: '#2C374B', fontSize: 13, fontWeight: '700' },
  focusHint: { marginTop: 5, color: colors.muted, fontSize: 10 },
  taskRow: { minHeight: 62, borderBottomWidth: 1, borderBottomColor: '#F0F2F6', flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10 },
  check: { width: 21, height: 21, borderRadius: 7, borderWidth: 1.4, borderColor: '#C3C9D6', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
  taskTitle: { color: '#2E394D', fontSize: 13, fontWeight: '600' },
  done: { color: '#A7AEBC', textDecorationLine: 'line-through' },
  taskHint: { marginTop: 4, color: colors.muted, fontSize: 10 },
  iconButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  emptyInline: { paddingVertical: 18, color: colors.muted, fontSize: 12, textAlign: 'center' },
  recurring: { minHeight: 60, borderBottomWidth: 1, borderBottomColor: '#F0F2F6', flexDirection: 'row', alignItems: 'center', gap: 11 },
  recurringIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  enabled: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: '#EAF8F2' },
  enabledText: { color: colors.success, fontSize: 10, fontWeight: '700' },
  disabled: { backgroundColor: '#F1F2F6' },
  disabledText: { color: colors.muted },
  twoCol: { marginTop: 18, flexDirection: 'row', gap: 11 },
  smallCard: { minHeight: 108, padding: 13, justifyContent: 'space-between' },
  progressCard: { flex: 1 },
  label: { color: colors.muted, fontSize: 10 },
  metric: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 10 },
  progressRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 5, borderColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  progressValue: { color: colors.purple, fontSize: 13, fontWeight: '700' },
  noteRow: { minHeight: 46, borderBottomWidth: 1, borderBottomColor: '#F0F2F6', flexDirection: 'row', alignItems: 'center', gap: 9 },
  noteTitle: { flex: 1, color: '#3B4559', fontSize: 12, fontWeight: '600' },
  noteDate: { color: colors.muted, fontSize: 10 },
  insight: { marginTop: 18, padding: 14, borderRadius: 15, backgroundColor: '#FFF8E9', flexDirection: 'row', gap: 10, alignItems: 'center' },
  insightTitle: { color: '#8A6614', fontSize: 12, fontWeight: '700' },
  insightText: { marginTop: 4, color: '#9B7A2E', fontSize: 11, lineHeight: 16 },
  planCard: { marginTop: 16, padding: 15, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: '#E4E0FF', ...shadow },
  planHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  aiBadge: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  planTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  planSummary: { marginTop: 4, color: colors.muted, fontSize: 11, lineHeight: 16 },
  planNote: { fontSize: 11, color: '#C2410C', fontWeight: '600', marginTop: 4 },
  planAction: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  planDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.purple },
  planActionTitle: { color: '#2F3A4E', fontSize: 12, fontWeight: '600' },
  planActionHint: { marginTop: 3, color: colors.muted, fontSize: 10 },
  planFooter: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  planMeta: { flex: 1, color: colors.muted, fontSize: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  sheetHint: { marginTop: 10, color: colors.muted, fontSize: 11, lineHeight: 17 },
  sheetActions: { marginTop: 12, flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  manageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F2F6' },
  settingLine: { color: '#3B4559', fontSize: 12, marginBottom: 6 },
  fab: { width: 49, height: 49, borderRadius: 25, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', ...shadow },
  pressed: { opacity: 0.7 },
});
