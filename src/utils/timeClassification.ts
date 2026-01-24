import type { Task } from '../types/models';

export type TaskTimeCategory = 'overdue' | 'today' | 'upcoming' | 'no_date' | 'completed';

/**
 * Get start of today (midnight) as timestamp
 */
function getStartOfToday(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

/**
 * Get end of today (23:59:59) as timestamp
 */
function getEndOfToday(): number {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today.getTime();
}

/**
 * Check if a timestamp has a time component (not midnight)
 */
export function hasTimeComponent(timestamp: number): boolean {
  const date = new Date(timestamp);
  return date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
}

/**
 * Classify a task into a time category
 */
export function classifyTask(task: Task): TaskTimeCategory {
  // Completed tasks always in completed category
  if (task.completed) {
    return 'completed';
  }

  // No due date
  if (!task.due_date) {
    return 'no_date';
  }

  const now = Date.now();
  const startOfToday = getStartOfToday();
  const endOfToday = getEndOfToday();

  // Overdue: due date is before today
  if (task.due_date < startOfToday) {
    return 'overdue';
  }

  // Today: due date is within today
  if (task.due_date >= startOfToday && task.due_date <= endOfToday) {
    return 'today';
  }

  // Upcoming: due date is after today
  return 'upcoming';
}

/**
 * Compare tasks for ordering within a time category
 * Tasks with time come first, ordered by time
 * Date-only tasks come after, ordered by date
 */
export function compareTasksByTime(a: Task, b: Task): number {
  if (!a.due_date && !b.due_date) return 0;
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;

  const aHasTime = hasTimeComponent(a.due_date);
  const bHasTime = hasTimeComponent(b.due_date);

  // Tasks with time before tasks without time
  if (aHasTime && !bHasTime) return -1;
  if (!aHasTime && bHasTime) return 1;

  // Both have time or both don't have time - sort by timestamp
  return a.due_date - b.due_date;
}

/**
 * Group tasks by time category
 */
export interface GroupedTasks {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  no_date: Task[];
  completed: Task[];
}

export function groupTasksByTime(tasks: Task[]): GroupedTasks {
  const grouped: GroupedTasks = {
    overdue: [],
    today: [],
    upcoming: [],
    no_date: [],
    completed: [],
  };

  tasks.forEach(task => {
    const category = classifyTask(task);
    grouped[category].push(task);
  });

  // Sort each category: timed tasks first, then date-only
  grouped.overdue.sort(compareTasksByTime);
  grouped.today.sort(compareTasksByTime);
  grouped.upcoming.sort(compareTasksByTime);

  return grouped;
}

/**
 * Format relative date for display (date only, no time)
 */
export function formatRelativeDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = getStartOfToday();
  const tomorrow = today + 86400000; // +1 day in ms

  if (timestamp < today) {
    return 'Overdue';
  }

  if (timestamp >= today && timestamp < tomorrow) {
    return 'Today';
  }

  // Format as "Jan 25" or "Tomorrow" for next day
  const diff = timestamp - today;
  if (diff < 86400000 * 2) { // Within 2 days
    return 'Tomorrow';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format date with optional time component
 * Returns "📅 Today" or "⏰ Today, 14:30"
 */
export function formatDateTimeDisplay(timestamp: number): string {
  const relativeDate = formatRelativeDate(timestamp);
  const hasTime = hasTimeComponent(timestamp);

  if (!hasTime) {
    return `📅 ${relativeDate}`;
  }

  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  return `⏰ ${relativeDate}, ${timeStr}`;
}