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
  const taskHasTime = hasTimeComponent(task.due_date);

  // If task has a specific time, check if that time has passed
  if (taskHasTime) {
    // Overdue: specific time has passed
    if (task.due_date < now) {
      return 'overdue';
    }

    // Today: time is later today
    if (task.due_date >= now && task.due_date <= endOfToday) {
      return 'today';
    }

    // Upcoming: time is in the future (tomorrow or later)
    return 'upcoming';
  }

  // Date-only tasks (no specific time)
  // Overdue: due date is before today (any time yesterday or earlier counts as overdue)
  if (task.due_date < startOfToday) {
    return 'overdue';
  }

  // Today: due date is within today (entire day is valid)
  if (task.due_date >= startOfToday && task.due_date <= endOfToday) {
    return 'today';
  }

  // Upcoming: due date is after today
  return 'upcoming';
}

/**
 * Compare tasks for ordering within a time category
 * Order: timed before date-only → priority (1,2,3) → timestamp
 */
export function compareTasksByTime(a: Task, b: Task): number {
  // Handle no-date tasks
  if (!a.due_date && !b.due_date) {
    // Both have no date - sort by priority then created_at
    const aPriority = a.calm_priority ?? 2;
    const bPriority = b.calm_priority ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.created_at - b.created_at;
  }
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;

  const aHasTime = hasTimeComponent(a.due_date);
  const bHasTime = hasTimeComponent(b.due_date);

  // Tasks with time before tasks without time
  if (aHasTime && !bHasTime) return -1;
  if (!aHasTime && bHasTime) return 1;

  // Both have time or both don't have time
  // Sort by priority first (1 before 2 before 3)
  const aPriority = a.calm_priority ?? 2;
  const bPriority = b.calm_priority ?? 2;
  if (aPriority !== bPriority) {
    return aPriority - bPriority;
  }

  // Same priority - sort by timestamp
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

  // Sort each category: timed tasks first, then by priority, then by timestamp
  grouped.overdue.sort(compareTasksByTime);
  grouped.today.sort(compareTasksByTime);
  grouped.upcoming.sort(compareTasksByTime);
  grouped.no_date.sort(compareTasksByTime);

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