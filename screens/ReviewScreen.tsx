import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLifeOS, useNavigation } from '../store/LifeOSContext';
import { Card, GhostButton, colors, Header, PrimaryButton, Screen, Segment, Sheet } from '../components/ui';
import { localDatabase } from '../services/storage';
import { addDays, localDateNow } from '../utils/datetime';

const RANGES: { label: string; days: number }[] = [
  { label: '日总结', days: 1 },
  { label: '周总结', days: 7 },
  { label: '月总结', days: 30 },
  { label: '长期', days: 3650 },
];

export function ReviewScreen() {
  const { state, showToast } = useLifeOS();
  const { go } = useNavigation();
  const [range, setRange] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportText, setExportText] = useState('');

  const windowDays = RANGES[range].days;
  const since = addDays(localDateNow(), -(windowDays - 1));
  const rangeLabel = windowDays === 1 ? '今天' : windowDays === 7 ? '近 7 天' : windowDays === 30 ? '近 30 天' : '全部时间';

  const metrics = useMemo(() => {
    const tasks = state.tasks.filter((task) => task.dueDate >= since);
    const done = tasks.filter((task) => task.status === 'done').length;
    const tasksWithReminder = tasks.filter((task) => task.reminderAt).length;
    const workoutsInRange = state.workouts.filter((workout) => workout.date >= since);
    const completedWorkouts = workoutsInRange.filter((workout) => workout.completed).length;
    const notesInRange = state.notes.filter((note) => (note.createdAt ?? since) >= since);
    const weightsInRange = state.weights.filter((entry) => entry.date >= since);
    const weightChange = weightsInRange.length > 1
      ? Number((weightsInRange[weightsInRange.length - 1].weightKg - weightsInRange[0].weightKg).toFixed(1))
      : 0;
    const remindersScheduled = tasks.filter((task) => task.reminderAt && task.status === 'todo').length;
    return {
      taskRate: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      taskTotal: tasks.length,
      taskDone: done,
      recurringEnabled: state.recurringTasks.filter((item) => item.enabled).length,
      recurringTotal: state.recurringTasks.length,
      fitnessRate: workoutsInRange.length ? Math.round((completedWorkouts / workoutsInRange.length) * 100) : 0,
      workoutCount: completedWorkouts,
      noteCount: notesInRange.length,
      weightsInRange,
      weightChange,
      tasksWithReminder,
      remindersScheduled,
    };
  }, [state, since]);

  const advice = useMemo(() => {
    const list: string[] = [];
    const pending = state.tasks.filter((task) => task.dueDate >= since && task.status !== 'done');
    if (pending.length) list.push(`还有 ${pending.length} 项任务未完成，优先处理「${pending[0].title}」`);
    if (!metrics.remindersScheduled) list.push('今天没有已排定的任务提醒，可为关键任务设置提醒时间');
    if (metrics.fitnessRate < 100) list.push('训练完成率未满，建议固定一个训练时段');
    if (!state.weights.length) list.push('还没有体重记录，先记录一次基线数据');
    else if (metrics.weightChange !== 0) list.push(`体重较区间起点变化 ${metrics.weightChange > 0 ? '+' : ''}${metrics.weightChange} kg`);
    if (!state.notes.length) list.push('笔记还是空的，试着让 AI 帮你记录今天的想法');
    if (!list.length) list.push('当前节奏稳定，保持现有安排即可');
    return list.slice(0, 4);
  }, [state, metrics, since]);

  const openExport = async () => {
    const text = await localDatabase.exportJSON(state);
    setExportText(text);
    setExportOpen(true);
    showToast('已生成本机数据快照');
  };

  return (
    <>
      <Screen>
        <Header title="总结" subtitle={`${rangeLabel} · 数据来自本机记录`} icon="download-outline" onAction={openExport} />
        <Segment values={RANGES.map((item) => item.label)} active={range} onChange={setRange} />

        <View style={styles.range}>
          <Pressable onPress={() => setRange((prev) => Math.max(prev - 1, 0))} style={styles.arrow} accessibilityLabel="上一个周期">
            <Ionicons name="chevron-back" size={18} color={colors.muted} />
          </Pressable>
          <Text style={styles.rangeText}>{rangeLabel} · {since} 起</Text>
          <Pressable onPress={() => setRange((prev) => Math.min(prev + 1, RANGES.length - 1))} style={styles.arrow} accessibilityLabel="下一个周期">
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        </View>

        <Text style={styles.label}>区间概览</Text>
        <View style={styles.grid}>
          {[
            ['任务完成率', `${metrics.taskRate}%`, `${metrics.taskDone}/${metrics.taskTotal} 项`, '#FFF5EA'],
            ['周期任务', `${metrics.recurringEnabled}`, `共 ${metrics.recurringTotal} 个启用`, '#F0EEFF'],
            ['训练完成', `${metrics.fitnessRate}%`, `${metrics.workoutCount} 次训练`, '#EAF8F2'],
            ['提醒排定', `${metrics.tasksWithReminder}`, `今日待触发 ${metrics.remindersScheduled}`, '#EFF6FF'],
            ['新增笔记', `${metrics.noteCount}`, `累计 ${state.notes.length} 篇`, '#F9F0FF'],
            ['体重区间变化', `${metrics.weightChange > 0 ? '+' : ''}${metrics.weightChange}kg`, `${metrics.weightsInRange.length} 条记录`, '#F4F7F7'],
          ].map(([label, value, delta, bg]) => (
            <View style={[styles.stat, { backgroundColor: bg }]} key={label}>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
              <Text style={styles.delta}>{delta}</Text>
            </View>
          ))}
        </View>

        <Card style={styles.ai}>
          <View style={styles.aiHead}>
            <Ionicons name="bulb-outline" size={18} color={colors.purple} />
            <Text style={styles.label}>下一步建议（根据你的真实数据生成）</Text>
          </View>
          {advice.map((item, index) => <Text style={styles.advice} key={item}>{index + 1}.  {item}</Text>)}
          <View style={styles.divider} />
          <View style={styles.aiActions}>
            <GhostButton label="去今天安排" icon="home-outline" onPress={() => go('today')} />
            <GhostButton label="看时间轴" icon="calendar-outline" onPress={() => go('timeline')} />
          </View>
          <View style={styles.aiActions}>
            <PrimaryButton label="导出数据快照" icon="download-outline" onPress={openExport} />
          </View>
        </Card>
      </Screen>

      <Sheet visible={exportOpen} title="本机数据快照（JSON）" onClose={() => setExportOpen(false)}
        footer={<><GhostButton label="去今天" icon="home-outline" onPress={() => { setExportOpen(false); go('today'); }} /><PrimaryButton label="关闭" onPress={() => setExportOpen(false)} /></>}
      >
        <Text style={styles.sheetHint}>下面是当前全部数据的 JSON，可直接复制保存，用于备份或迁移。</Text>
        <ScrollView style={styles.jsonBox} nestedScrollEnabled>
          <Text selectable style={styles.jsonText}>{exportText}</Text>
        </ScrollView>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  range: { marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  arrow: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  rangeText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  label: { color: '#283348', fontSize: 14, fontWeight: '700' },
  grid: { marginTop: 11, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48%', minHeight: 100, borderRadius: 15, padding: 13 },
  statLabel: { color: colors.muted, fontSize: 10 },
  value: { marginTop: 10, color: colors.ink, fontSize: 22, fontWeight: '700' },
  delta: { marginTop: 4, color: '#6271C9', fontSize: 10 },
  ai: { marginTop: 17, padding: 16 },
  aiHead: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  advice: { color: '#4B5669', fontSize: 12, lineHeight: 24 },
  divider: { height: 1, marginVertical: 12, backgroundColor: colors.line },
  aiActions: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  sheetHint: { marginBottom: 10, color: colors.muted, fontSize: 11, lineHeight: 17 },
  jsonBox: { maxHeight: 320, borderRadius: 12, backgroundColor: '#F7F8FB', borderWidth: 1, borderColor: colors.line, padding: 10 },
  jsonText: { color: '#3B4559', fontSize: 10, lineHeight: 15 },
});
