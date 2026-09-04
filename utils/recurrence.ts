import type { RecurringTask, Task } from '../types';

export function createRecurringInstance(recurring: RecurringTask, date = recurring.nextRun): Task {
  return { id: `${recurring.id}-${date}`, title: recurring.title, time: recurring.time, dueDate: date, status: 'todo', kind: 'recurring-instance', category: 'life' };
}
