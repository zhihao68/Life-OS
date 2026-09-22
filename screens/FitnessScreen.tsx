import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLifeOS } from '../store/LifeOSContext';
import { Card, Field, GhostButton, colors, EmptyState, Header, PrimaryButton, Screen, SectionHeader, Segment, Sheet, shadow } from '../components/ui';
import { localDateNow } from '../utils/datetime';
import type { WeightEntry, WorkoutDay, WorkoutSet } from '../types';

export function FitnessScreen() {
  const {
    state, showToast,
    addWorkoutDay, updateWorkoutDay, removeWorkoutDay,
    addExercise, updateExercise, removeExercise,
    addWeight, updateWeight, deleteWeight,
    toggleWorkoutComplete,
  } = useLifeOS();
  const [tab, setTab] = useState(0);
  const [dayIndex, setDayIndex] = useState(0);

  const days = state.workoutPlan.days;
  const selected: WorkoutDay | undefined = days[Math.min(dayIndex, Math.max(days.length - 1, 0))];
  const workout = state.workouts[0];
  const exercises = workout?.sets ?? [];
  const weights = state.weights;
  const latest = weights[weights.length - 1];
  const first = weights[0];
  const delta = latest && first ? Number((latest.weightKg - first.weightKg).toFixed(1)) : 0;
  const previous = weights.length > 1 ? weights[weights.length - 2] : undefined;
  const stepDelta = latest && previous ? Number((latest.weightKg - previous.weightKg).toFixed(1)) : 0;

  const [daySheet, setDaySheet] = useState<{ open: boolean; id?: string }>({ open: false });
  const [dayDraft, setDayDraft] = useState({ day: '', focus: '' });
  const [exerciseSheet, setExerciseSheet] = useState<{ open: boolean; id?: string }>({ open: false });
  const [exerciseDraft, setExerciseDraft] = useState({ exercise: '', sets: '4', reps: '10', weightKg: '' });
  const [weightSheet, setWeightSheet] = useState<{ open: boolean; id?: string }>({ open: false });
  const [weightDraft, setWeightDraft] = useState({ date: localDateNow(), weightKg: '', note: '' });

  const chart = useMemo(() => {
    const items = weights.slice(-8);
    if (!items.length) return { items, min: 0, max: 1 };
    const values = items.map((item) => item.weightKg);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { items, min, max: max === min ? max + 1 : max };
  }, [weights]);

  const saveDay = () => {
    if (!dayDraft.focus.trim()) {
      showToast('请填写当天训练内容');
      return;
    }
    if (daySheet.id) {
      updateWorkoutDay(daySheet.id, { focus: dayDraft.focus.trim(), isRest: /休息|休$/.test(dayDraft.focus.trim()) });
      showToast('训练计划已更新');
    } else {
      addWorkoutDay(dayDraft.day.trim() || '加练', dayDraft.focus.trim());
      showToast('已新增训练日');
    }
    setDaySheet({ open: false });
    setDayDraft({ day: '', focus: '' });
  };

  const saveExercise = () => {
    const sets = Number(exerciseDraft.sets);
    const reps = Number(exerciseDraft.reps);
    const weightKg = exerciseDraft.weightKg ? Number(exerciseDraft.weightKg) : undefined;
    if (!exerciseDraft.exercise.trim()) {
      showToast('请填写动作名称');
      return;
    }
    if (!Number.isFinite(sets) || !Number.isFinite(reps) || sets <= 0 || reps <= 0) {
      showToast('组数和次数需要是大于 0 的数字');
      return;
    }
    if (exerciseSheet.id) {
      updateExercise(exerciseSheet.id, { exercise: exerciseDraft.exercise.trim(), sets, reps, weightKg });
      showToast('动作已更新');
    } else {
      addExercise({ exercise: exerciseDraft.exercise.trim(), sets, reps, weightKg });
      showToast('动作已添加');
    }
    setExerciseSheet({ open: false });
  };

  const saveWeight = () => {
    const value = Number(weightDraft.weightKg);
    if (!Number.isFinite(value) || value <= 20 || value > 300) {
      showToast('请输入合理的体重（20 - 300 kg）');
      return;
    }
    if (weightSheet.id) {
      updateWeight(weightSheet.id, { date: weightDraft.date, weightKg: value, note: weightDraft.note });
      showToast('体重记录已更新');
    } else {
      addWeight(weightDraft.date, value, weightDraft.note || undefined);
      showToast('体重已记录');
    }
    setWeightSheet({ open: false });
  };

  return (
    <>
      <Screen
        fab={
          <Pressable
            onPress={() => {
              if (tab === 0) {
                setDayDraft({ day: '', focus: '' });
                setDaySheet({ open: true });
              } else {
                setWeightDraft({ date: localDateNow(), weightKg: '', note: '' });
                setWeightSheet({ open: true });
              }
            }}
            style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
            accessibilityLabel={tab === 0 ? '新增训练日' : '记录体重'}
          >
            <Ionicons name="add" size={25} color="#fff" />
          </Pressable>
        }
      >
        <Header title="健身" subtitle={`本周计划 · 体重记录 ${weights.length} 条`} icon="add-outline" onAction={() => { setWeightDraft({ date: localDateNow(), weightKg: '', note: '' }); setWeightSheet({ open: true }); }} />
        <Segment values={['训练计划', '体重记录']} active={tab} onChange={setTab} />

        {tab === 0 ? (
          <>
            <View style={styles.week}>
              {days.map((item, index) => (
                <Pressable key={item.id} onPress={() => setDayIndex(index)} style={[styles.day, dayIndex === index && styles.daySelected]} accessibilityLabel={`星期${item.day}`}>
                  <Text style={[styles.dayLabel, dayIndex === index && styles.dayLabelActive]}>{item.day}</Text>
                  <Text style={[styles.dayFocus, dayIndex === index && styles.dayFocusActive]}>{item.isRest ? '休' : item.focus.slice(0, 2)}</Text>
                </Pressable>
              ))}
            </View>

            <Card style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eyebrow}>训练计划 · 周{selected?.day ?? '-'}</Text>
                  <Text style={styles.planTitle}>{selected?.focus ?? '未安排'}</Text>
                  <Text style={styles.hint}>{selected?.isRest ? '今天是恢复日' : `${exercises.length} 个动作 · 预计 ${workout?.durationMin ?? 60} 分钟`}</Text>
                </View>
                {selected && !selected.isRest ? (
                  <Pressable
                    onPress={() => { toggleWorkoutComplete(); showToast(workout?.completed ? '已标记为未完成' : '已完成今天的训练'); }}
                    style={({ pressed }) => [styles.start, workout?.completed && styles.startDone, pressed && styles.pressed]}
                    accessibilityLabel="开始或完成训练"
                  >
                    <Ionicons name={workout?.completed ? 'checkmark' : 'play'} size={13} color="#fff" />
                    <Text style={styles.startText}>{workout?.completed ? '已完成' : '开始训练'}</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.planActions}>
                <GhostButton label="编辑当天" icon="create-outline" onPress={() => {
                  if (!selected) return;
                  setDayDraft({ day: selected.day, focus: selected.focus });
                  setDaySheet({ open: true, id: selected.id });
                }} />
                <GhostButton label="设为休息" icon="moon-outline" onPress={() => {
                  if (!selected) return;
                  updateWorkoutDay(selected.id, { focus: '休息', isRest: true });
                  showToast('已设为恢复日');
                }} />
                <GhostButton label="删除当天" tone="danger" icon="trash-outline" onPress={() => {
                  if (!selected) return;
                  removeWorkoutDay(selected.id);
                  setDayIndex(0);
                  showToast('已删除该训练日');
                }} />
              </View>

              {!selected?.isRest && exercises.map((set) => (
                <View style={styles.exercise} key={set.id}>
                  <View style={styles.exerciseCheck} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseName}>{set.exercise}</Text>
                    <Text style={styles.exerciseDetail}>{set.sets} 组 × {set.reps} 次</Text>
                  </View>
                  <Text style={styles.weight}>{set.weightKg ? `${set.weightKg} kg` : '—'}</Text>
                  <Pressable onPress={() => {
                    setExerciseDraft({ exercise: set.exercise, sets: `${set.sets}`, reps: `${set.reps}`, weightKg: set.weightKg ? `${set.weightKg}` : '' });
                    setExerciseSheet({ open: true, id: set.id });
                  }} style={styles.iconButton} accessibilityLabel="编辑动作">
                    <Ionicons name="create-outline" size={16} color="#8E97A8" />
                  </Pressable>
                  <Pressable onPress={() => { removeExercise(set.id); showToast('动作已删除'); }} style={styles.iconButton} accessibilityLabel="删除动作">
                    <Ionicons name="trash-outline" size={16} color="#C3C9D4" />
                  </Pressable>
                </View>
              ))}

              {!selected?.isRest ? (
                <Pressable
                  onPress={() => { setExerciseDraft({ exercise: '', sets: '4', reps: '10', weightKg: '' }); setExerciseSheet({ open: true }); }}
                  style={({ pressed }) => [styles.addExercise, pressed && styles.pressed]}
                  accessibilityLabel="新增动作"
                >
                  <Ionicons name="add-circle-outline" size={17} color={colors.purple} />
                  <Text style={styles.addExerciseText}>新增动作</Text>
                </Pressable>
              ) : null}
            </Card>

            <SectionHeader title="训练概览" action="刷新统计" onAction={() => showToast(`共 ${state.workouts.length} 条训练记录`)} />
            <View style={styles.stats}>
              <View><Text style={styles.big}>{workout?.completed ? '1/1' : '0/1'}</Text><Text style={styles.hint}>今日完成</Text></View>
              <View><Text style={styles.big}>{workout?.durationMin ?? 60} <Text style={styles.unit}>分钟</Text></Text><Text style={styles.hint}>计划时长</Text></View>
              <View><Text style={styles.big}>{exercises.length}</Text><Text style={styles.hint}>动作数量</Text></View>
            </View>
          </>
        ) : (
          <>
            <Card style={styles.weightCard}>
              <View style={styles.weightHead}>
                <View>
                  <Text style={styles.eyebrow}>当前体重</Text>
                  <Text style={styles.weightValue}>{latest ? `${latest.weightKg}` : '--'} <Text style={styles.unit}>kg</Text></Text>
                  <Text style={styles.hint}>
                    {latest ? `记录于 ${latest.date}` : '还没有记录，点右下角添加'}
                    {previous ? ` · 较上次 ${stepDelta > 0 ? '+' : ''}${stepDelta} kg` : ''}
                  </Text>
                </View>
                <View style={[styles.deltaBadge, delta <= 0 ? styles.deltaGood : styles.deltaWarn]}>
                  <Text style={[styles.deltaText, delta <= 0 ? styles.deltaTextGood : styles.deltaTextWarn]}>
                    累计 {delta > 0 ? '+' : ''}{delta} kg
                  </Text>
                </View>
              </View>

              <View style={styles.chart}>
                {chart.items.length ? chart.items.map((entry) => {
                  const ratio = (entry.weightKg - chart.min) / (chart.max - chart.min);
                  const height = 24 + ratio * 74;
                  return (
                    <View key={entry.id} style={styles.barCol}>
                      <Text style={styles.barValue}>{entry.weightKg}</Text>
                      <View style={[styles.bar, { height }]} />
                      <Text style={styles.barLabel}>{entry.date.slice(5)}</Text>
                    </View>
                  );
                }) : <Text style={styles.emptyInline}>记录两次以上就能看到趋势</Text>}
              </View>
            </Card>

            <SectionHeader title="历史记录" action="新增记录" onAction={() => { setWeightDraft({ date: localDateNow(), weightKg: '', note: '' }); setWeightSheet({ open: true }); }} />
            <Card>
              {weights.length ? [...weights].reverse().map((entry) => (
                <WeightRow
                  key={entry.id}
                  entry={entry}
                  onEdit={() => { setWeightDraft({ date: entry.date, weightKg: `${entry.weightKg}`, note: entry.note ?? '' }); setWeightSheet({ open: true, id: entry.id }); }}
                  onDelete={() => { deleteWeight(entry.id); showToast('记录已删除'); }}
                />
              )) : <EmptyState icon="scale-outline" title="还没有体重记录" detail="点右下角加号记录今天的体重" />}
            </Card>
          </>
        )}
      </Screen>

      {/* 训练日编辑 */}
      <Sheet
        visible={daySheet.open}
        title={daySheet.id ? '编辑训练日' : '新增训练日'}
        onClose={() => setDaySheet({ open: false })}
        footer={<><GhostButton label="取消" onPress={() => setDaySheet({ open: false })} /><PrimaryButton label="保存" icon="checkmark" onPress={saveDay} /></>}
      >
        <Field label="星期（仅新增时使用）" value={dayDraft.day} onChangeText={(day) => setDayDraft((prev) => ({ ...prev, day }))} placeholder="例如：六 / 加练" />
        <Field label="训练内容" value={dayDraft.focus} onChangeText={(focus) => setDayDraft((prev) => ({ ...prev, focus }))} placeholder="例如：胸 + 三头 / 休息" />
        <Text style={styles.sheetHint}>填写「休息」会自动识别为恢复日。</Text>
      </Sheet>

      {/* 动作编辑 */}
      <Sheet
        visible={exerciseSheet.open}
        title={exerciseSheet.id ? '编辑动作' : '新增动作'}
        onClose={() => setExerciseSheet({ open: false })}
        footer={<><GhostButton label="取消" onPress={() => setExerciseSheet({ open: false })} /><PrimaryButton label="保存" icon="checkmark" onPress={saveExercise} /></>}
      >
        <Field label="动作名称" value={exerciseDraft.exercise} onChangeText={(exercise) => setExerciseDraft((prev) => ({ ...prev, exercise }))} placeholder="例如：卧推" />
        <Field label="组数" value={exerciseDraft.sets} onChangeText={(sets) => setExerciseDraft((prev) => ({ ...prev, sets }))} keyboardType="numeric" placeholder="4" />
        <Field label="每组次数" value={exerciseDraft.reps} onChangeText={(reps) => setExerciseDraft((prev) => ({ ...prev, reps }))} keyboardType="numeric" placeholder="10" />
        <Field label="重量 kg（可留空）" value={exerciseDraft.weightKg} onChangeText={(weightKg) => setExerciseDraft((prev) => ({ ...prev, weightKg }))} keyboardType="decimal-pad" placeholder="60" />
      </Sheet>

      {/* 体重记录 */}
      <Sheet
        visible={weightSheet.open}
        title={weightSheet.id ? '编辑体重记录' : '记录体重'}
        onClose={() => setWeightSheet({ open: false })}
        footer={<><GhostButton label="取消" onPress={() => setWeightSheet({ open: false })} /><PrimaryButton label="保存" icon="checkmark" onPress={saveWeight} /></>}
      >
        <Field label="日期（YYYY-MM-DD）" value={weightDraft.date} onChangeText={(date) => setWeightDraft((prev) => ({ ...prev, date }))} placeholder="2026-09-22" />
        <Field label="体重 kg" value={weightDraft.weightKg} onChangeText={(weightKg) => setWeightDraft((prev) => ({ ...prev, weightKg }))} keyboardType="decimal-pad" placeholder="72.4" />
        <Field label="备注（可留空）" value={weightDraft.note} onChangeText={(note) => setWeightDraft((prev) => ({ ...prev, note }))} placeholder="空腹 / 运动后" />
        <Text style={styles.sheetHint}>同一天再次记录会覆盖当天数据。</Text>
      </Sheet>
    </>
  );
}

function WeightRow({ entry, onEdit, onDelete }: { entry: WeightEntry; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={styles.weightRow}>
      <View style={styles.weightIcon}><Ionicons name="scale-outline" size={17} color={colors.purple} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.exerciseName}>{entry.weightKg} kg</Text>
        <Text style={styles.exerciseDetail}>{entry.date}{entry.note ? ` · ${entry.note}` : ''}</Text>
      </View>
      <Pressable onPress={onEdit} style={styles.iconButton} accessibilityLabel="编辑体重记录"><Ionicons name="create-outline" size={17} color="#8E97A8" /></Pressable>
      <Pressable onPress={onDelete} style={styles.iconButton} accessibilityLabel="删除体重记录"><Ionicons name="trash-outline" size={17} color="#C3C9D4" /></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  week: { height: 69, paddingHorizontal: 7, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  day: { width: 40, height: 55, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  daySelected: { backgroundColor: colors.purple },
  dayLabel: { color: colors.muted, fontSize: 11 },
  dayLabelActive: { color: '#fff', fontWeight: '700' },
  dayFocus: { marginTop: 7, color: '#4F596C', fontSize: 9 },
  dayFocusActive: { color: '#EDEAFF' },
  planCard: { marginTop: 14, padding: 15 },
  planHeader: { paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#EFF1F5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  eyebrow: { color: colors.muted, fontSize: 10 },
  planTitle: { marginTop: 5, color: colors.ink, fontSize: 18, fontWeight: '700' },
  hint: { marginTop: 5, color: colors.muted, fontSize: 10 },
  start: { height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: colors.purple, flexDirection: 'row', alignItems: 'center', gap: 5 },
  startDone: { backgroundColor: colors.success },
  startText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  planActions: { marginTop: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  exercise: { minHeight: 55, borderBottomWidth: 1, borderBottomColor: '#F0F2F6', flexDirection: 'row', alignItems: 'center', gap: 8 },
  exerciseCheck: { width: 18, height: 18, borderRadius: 6, borderWidth: 1.3, borderColor: '#B4BBC8' },
  exerciseName: { color: '#445065', fontSize: 12 },
  exerciseDetail: { marginTop: 4, color: colors.muted, fontSize: 10 },
  weight: { color: '#7B84A0', fontSize: 11, fontWeight: '600' },
  iconButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  addExercise: { marginTop: 12, height: 40, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CFD4E4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addExerciseText: { color: colors.purple, fontSize: 12, fontWeight: '600' },
  stats: { padding: 16, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', justifyContent: 'space-between' },
  big: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  unit: { fontSize: 10, fontWeight: '500' },
  weightCard: { padding: 16 },
  weightHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  weightValue: { marginTop: 6, color: colors.ink, fontSize: 28, fontWeight: '700' },
  deltaBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 11 },
  deltaGood: { backgroundColor: '#EAF8F2' },
  deltaWarn: { backgroundColor: '#FFF3E6' },
  deltaText: { fontSize: 11, fontWeight: '700' },
  deltaTextGood: { color: colors.success },
  deltaTextWarn: { color: '#C2761B' },
  chart: { height: 140, marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  barCol: { alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  bar: { width: 22, borderRadius: 8, backgroundColor: '#A99AF7' },
  barValue: { color: '#6F7890', fontSize: 9 },
  barLabel: { color: colors.muted, fontSize: 9 },
  emptyInline: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: 12, paddingVertical: 30 },
  weightRow: { minHeight: 58, borderBottomWidth: 1, borderBottomColor: '#F0F2F6', flexDirection: 'row', alignItems: 'center', gap: 10 },
  weightIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  sheetHint: { marginTop: 6, color: colors.muted, fontSize: 11, lineHeight: 17 },
  fab: { width: 49, height: 49, borderRadius: 25, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', ...shadow },
  pressed: { opacity: 0.7 },
});
