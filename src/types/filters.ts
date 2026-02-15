/**
 * Task Filter Types
 * 
 * TICKET 17A: Centralized Task Filter Architecture
 * 
 * Defines the canonical set of task filters used across the app.
 * These filters determine WHICH tasks are visible in TasksScreen.
 * 
 * IMPORTANT: After this ticket, NO string literals like 'today', 'overdue'
 * should exist outside of this file and taskFilters.ts.
 * 
 * All filter-related code must import and use this type.
 */

/**
 * Task filter options
 * 
 * - 'all': All active (non-completed) tasks
 * - 'today': Tasks due today (includes both date-only and timed)
 * - 'overdue': Tasks past their due date/time
 * - 'upcoming': Tasks due in the future (tomorrow or later)
 * - 'no-date': Tasks without a due date
 * - 'completed': Completed tasks only (shows completed section expanded)
 */
export type TaskFilter = 
  | 'all' 
  | 'today' 
  | 'overdue' 
  | 'upcoming' 
  | 'no-date'
  | 'completed';

/**
 * Task view state
 * 
 * Container for task view configuration passed from Overview/navigation.
 * Designed for future extensibility without architecture changes.
 * 
 * FIX 1 (17B): Added fromOverview flag to control empty state persistence
 * - Only show empty state when explicitly navigating FROM Overview card
 * - Prevents message flash on subsequent navigation
 * 
 * Future additions might include:
 * - scrollToTaskId?: string
 * - focusMode?: boolean
 * - highlightTaskId?: string
 * - sectionAnchor?: string
 */
export interface TaskViewState {
  filter: TaskFilter;
  fromOverview?: boolean;  // FIX 1: True when navigating from Overview card click
}
