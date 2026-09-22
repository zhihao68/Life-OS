import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLifeOS } from '../store/LifeOSContext';
import { Card, GhostButton, colors, EmptyState, Header, Screen, Segment, Sheet } from '../components/ui';
import { addDays, dateLabel, localDateNow } from '../utils/datetime';
import type { TimelineEvent } from '../types';

const eventColors: Record<TimelineEvent['type'], string> = { task: colors.purple, workout: '#F09242', note: '#4BA9CF', journal: '#D27AB1', ai: '#5F8EF4' };
const eventIcons: Record<TimelineEvent['type'], keyof typeof Ionicons.glyphMap> = { task: 'checkbox-outline', workout: 'barbell-outline', note: 'bulb-outline', journal: 'create-outline', ai: 'sparkles-outline' };

export function TimelineScreen() {
  const { state, toggleTask, showToast } = useLifeOS();
  const [range, setRange] = useState(0);
  const [offset, setOffset] = useState(0);
  const [detail, setDetail] = useState<TimelineEvent | null>(null);

  const today = localDateNow();
  const selectedDate = addDays(today, offset);

  const events = useMemo(() => {
    const all = [...state.timelineEvents];
    const inRange = all.filter((event) => {
      if (range === 0) return event.date === selectedDate;
      if (range === 1) return event.date >= addDays(selectedDate, -6) && event.date <= selectedDate;
      return event.date.slice(0, 7) === selectedDate.slice(0, 7);
    });
    return inRange.sort((a, b) => a.time.localeCompare(b.time));
  }, [state.timelineEvents, range, selectedDate]);

  const rangeCaption = range === 0 ? `${dateLabel(selectedDate)} 的行动轨迹` : range === 1 ? '最近 7 天的行动轨迹' : `${Number(selectedDate.slice(5, 7))} 月的行动轨迹`;

  return (
    <>
      <Screen>
        <Header title="时间轴" subtitle={`共 ${state.timelineEvents.length} 条记录`} icon="today-outline" onAction={() => { setOffset(0); setRange(0); showToast('已回到今天'); }} />
        <Segment values={['今天', '本周', '本月']} active={range} onChange={(index) => { setRange(index); setOffset(0); }} />

        <View style={styles.dateRow}>
          <Pressable onPress={() => setOffset((prev) => prev - (range === 0 ? 1 : range === 1 ? 7 : 30))} style={styles.arrow} accessibilityLabel="向前切换时间">
            <Ionicons name="chevron-back" size={18} color={colors.muted} />
          </Pressable>
          <Pressable onPress={() => { setOffset(0); showToast('已回到今天'); }} accessibilityLabel="回到今天">
            <Text style={styles.date}>{range === 0 ? dateLabel(selectedDate) : rangeCaption}</Text>
            {offset !== 0 ? <Text style={styles.dateHint}>点击回到今天</Text> : null}
          </Pressable>
          <Pressable onPress={() => setOffset((prev) => Math.min(prev + (range === 0 ? 1 : range === 1 ? 7 : 30), 0))} style={styles.arrow} accessibilityLabel="向后切换时间">
            <Ionicons name="chevron-forward" size={18} color={offset >= 0 ? '#D6DAE3' : colors.muted} />
          </Pressable>
        </View>

        <Text style={styles.caption}>{rangeCaption} · {events.length} 条</Text>

        {events.length ? (
          <View style={styles.timeline}>
            {events.map((event, index) => (
              <View key={event.id} style={styles.row}>
                <View style={styles.time}><Text style={styles.timeText}>{event.time}</Text></View>
                <View style={styles.rail}>
                  <View style={[styles.dot, { backgroundColor: eventColors[event.type] }]} />
                  {index < events.length - 1 ? <View style={styles.line} /> : null}
                </View>
                <Pressable style={{ flex: 1 }} onPress={() => setDetail(event)} accessibilityLabel={`查看 ${event.title}`}>
                  <Card style={styles.eventCard}>
                    <View style={[styles.eventIcon, { backgroundColor: `${eventColors[event.type]}18` }]}>
                      <Ionicons name={eventIcons[event.type]} size={17} color={eventColors[event.type]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventDetail}>{event.detail}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#C0C6D2" />
                  </Card>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Card><EmptyState icon="calendar-clear-outline" title="这段时间还没有记录" detail="完成任务、记录笔记或训练后会自动出现在这里" /></Card>
        )}
      </Screen>

      <Sheet visible={Boolean(detail)} title={detail?.title ?? '记录详情'} onClose={() => setDetail(null)}
        footer={detail?.linkedTaskId ? (
          <GhostButton label="切换关联任务状态" icon="checkbox-outline" onPress={() => {
            if (detail?.linkedTaskId) {
              toggleTask(detail.linkedTaskId);
              showToast('已更新关联任务状态');
            }
          }} />
        ) : undefined}
      >
        <Text style={styles.detailLine}>时间：{detail?.date} {detail?.time}</Text>
        <Text style={styles.detailLine}>类型：{detail?.type}</Text>
        <Text style={styles.detailLine}>说明：{detail?.detail}</Text>
        {detail?.linkedTaskId ? <Text style={styles.detailLine}>关联任务：{state.tasks.find((task) => task.id === detail.linkedTaskId)?.title ?? '已删除'}</Text> : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  dateRow: { marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  arrow: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  date: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  dateHint: { marginTop: 3, color: colors.muted, fontSize: 9, textAlign: 'center' },
  caption: { marginBottom: 10, color: colors.muted, fontSize: 11 },
  timeline: { paddingBottom: 20 },
  row: { minHeight: 77, flexDirection: 'row' },
  time: { width: 49, paddingTop: 15 },
  timeText: { color: colors.muted, fontSize: 11 },
  rail: { width: 20, alignItems: 'center', paddingTop: 17 },
  dot: { width: 8, height: 8, borderRadius: 4, zIndex: 1 },
  line: { position: 'absolute', top: 25, bottom: 0, width: 1, backgroundColor: colors.line },
  eventCard: { minHeight: 66, marginBottom: 10, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { color: '#2C374B', fontSize: 13, fontWeight: '600' },
  eventDetail: { marginTop: 4, color: colors.muted, fontSize: 10 },
  detailLine: { marginBottom: 9, color: '#4B5669', fontSize: 12, lineHeight: 18 },
});
