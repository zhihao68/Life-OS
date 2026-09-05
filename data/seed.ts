import type { LifeOSState } from '../types';
const today = new Date().toISOString().slice(0, 10);
export const seedState: LifeOSState = {
  tasks: [
    { id: 'task-paper', title: '修改论文第二章', time: '14:00', dueDate: today, status: 'todo', kind: 'one-off', category: 'work', reminder: '提前 10 分钟' },
    { id: 'task-workout', title: '健身训练（胸 + 三头）', time: '19:00', dueDate: today, status: 'done', kind: 'one-off', category: 'fitness' },
    { id: 'task-english', title: '学习英语 30 分钟', time: '20:30', dueDate: today, status: 'todo', kind: 'one-off', category: 'learning' },
    { id: 'task-reading', title: '阅读文献', time: '21:30', dueDate: today, status: 'todo', kind: 'one-off', category: 'learning' },
  ],
  recurringTasks: [
    { id: 'rec-water', title: '浇花', schedule: 'weekly', scheduleLabel: '每周六', time: '10:00', nextRun: today, enabled: true },
    { id: 'rec-weight', title: '记录体重', schedule: 'daily', scheduleLabel: '每天', time: '22:30', nextRun: today, enabled: true },
  ],
  notes: [
    { id: 'note-paper', title: '论文实验记录', markdown: '# 论文实验记录\n\n下一步整理 [[UASB实验数据]]。', folder: '研究', tags: ['研究', '论文'], updatedAt: '今天 09:20', pinned: true, linkedNoteIds: ['note-uasb'], relatedTaskIds: ['task-paper'] },
    { id: 'note-habit', title: '读书笔记《原子习惯》', markdown: '# 原子习惯\n\n让好习惯变得显而易见。', folder: '阅读', tags: ['阅读'], updatedAt: '昨天 11:30', pinned: true, linkedNoteIds: [], relatedTaskIds: [] },
    { id: 'note-uasb', title: 'UASB 实验数据分析', markdown: '# UASB 实验数据分析\n\n关联 [[论文实验记录]]。', folder: '实验', tags: ['实验', '数据'], updatedAt: '昨天 20:15', pinned: true, linkedNoteIds: ['note-paper'], relatedTaskIds: [] },
    { id: 'note-plan', title: '项目计划与安排', markdown: '# 项目计划与安排', folder: '生活', tags: ['规划'], updatedAt: '9月1日 21:00', linkedNoteIds: [], relatedTaskIds: [] },
  ],
  workoutPlan: { id: 'plan-week-36', weekLabel: '9月1日 - 9月7日', days: [{ day: '一', focus: '胸 + 三头' }, { day: '二', focus: '背 + 二头' }, { day: '三', focus: '休息', isRest: true }, { day: '四', focus: '胸部训练' }, { day: '五', focus: '肩' }, { day: '六', focus: '有氧' }, { day: '日', focus: '休息', isRest: true }] },
  workouts: [{ id: 'workout-1', date: today, focus: '胸部训练', durationMin: 60, completed: false, sets: [{ exercise: '卧推', weightKg: 60, reps: 8, sets: 4 }, { exercise: '上斜哑铃', weightKg: 20, reps: 10, sets: 3 }] }],
  timelineEvents: [
    { id: 'event-work', date: today, time: '09:00', title: '开始工作', detail: '专注模式', type: 'task' }, { id: 'event-note', date: today, time: '11:30', title: '记录灵感', detail: '笔记 · 灵感记录', type: 'note' }, { id: 'event-paper', date: today, time: '14:00', title: '修改论文第二章', detail: '工作任务', type: 'task', linkedTaskId: 'task-paper' }, { id: 'event-fit', date: today, time: '19:00', title: '健身训练', detail: '胸 + 三头', type: 'workout', linkedTaskId: 'task-workout' }, { id: 'event-english', date: today, time: '20:30', title: '学习英语', detail: '30 分钟', type: 'task', linkedTaskId: 'task-english' }, { id: 'event-journal', date: today, time: '22:30', title: '写日记', detail: '记录今天的收获', type: 'journal' },
  ],
};
