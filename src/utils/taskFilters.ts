/**
 * Task Filtering Utility
 * 
 * TICKET 17A: Centralized Task Filter Architecture
 * TICKET 17A HARDENING: Memoization, exhaustiveness checks, defensive safety
 * 
 * SINGLE SOURCE OF TRUTH for task filtering logic.
 * All screens that need to filter tasks MUST use this utility.
 * 
 * ARCHITECTURE PRINCIPLES:
 * 1. Pure function - no side effects, no database access, no state
 * 2. In-memory filtering - operates on already-loaded task arrays
 * 3. Reuses existing logic - delegates to timeClassification.ts
 * 4. Type-safe - uses TaskFilter type, no string literals
 * 5. Exhaustiveness checks - TypeScript enforces updates on new filters
 * 6. Defensive - handles invalid filters gracefully
 * 
 * USAGE:
 * ```typescript
 * const allTasks = await getAllActiveTasks();
 * const visibleTasks = applyTaskFilter(allTasks, 'today');
 * const grouped = groupTasksByTime(visibleTasks);
 * ```
 * 
 * FUTURE EVOLUTION PATTERN (Not Implemented Yet):
 * ================================================
 * Current approach couples filters to TaskTimeCategory enum.
 * If time classification evolves, filter semantics could drift.
 * 
 * Alternative approach for complete decoupling:
 * ```typescript
 * const filterPredicates: Record<TaskFilter, (task: Task) => boolean> = {
 *   'all': (task) => !task.completed,
 *   'today': (task) => !task.completed && classifyTask(task) === 'today',
 *   'overdue': (task) => !task.completed && classifyTask(task) === 'overdue',
 *   // ...
 * };
 * 
 * export function applyTaskFilter(tasks: Task[], filter: TaskFilter): Task[] {
 *   const predicate = filterPredicates[filter];
 *   return tasks.filter(predicate);
 * }
 * ```
 * 
 * Benefits of predicate pattern:
 * - Filters fully own their logic
 * - No coupling to external enums
 * - Easier to add complex filters (e.g., "high priority AND overdue")
 * - More testable (can test predicates independently)
 * 
 * Migration timing:
 * - When adding first filter that doesn't map to TaskTimeCategory
 * - When classification logic needs to evolve independently
 * - When filter combinations become needed
 * 
 * For now, current approach is simpler and sufficient.
 */

import type { Task } from '../types/models';
import type { TaskFilter } from '../types/filters';
import { classifyTask, type TaskTimeCategory } from './timeClassification';

/**
 * Apply a filter to a list of tasks
 * 
 * CRITICAL: This function determines WHICH tasks are visible.
 * It does NOT determine HOW they are grouped/sectioned (that's groupTasksByTime).
 * 
 * FILTERING HAPPENS BEFORE GROUPING.
 * 
 * @param tasks - Array of tasks to filter (typically from getAllActiveTasks())
 * @param filter - Filter to apply (must be TaskFilter type, not string literal)
 * @returns Filtered array of tasks matching the filter criteria
 * 
 * IMPLEMENTATION NOTES:
 * - Reuses classifyTask() from timeClassification.ts
 * - No date logic duplication
 * - Completed tasks filtered separately (not part of filter types)
 * - 'all' means all ACTIVE tasks (completed handled separately in UI)
 * 
 * TICKET 17A HARDENING:
 * - Added defensive check for invalid filter values
 * - Clarified 'all' semantics with explicit comment
 */
export function applyTaskFilter(
  tasks: Task[],
  filter: TaskFilter
): Task[] {
  // TICKET 17A HARDENING: 'all' means "all ACTIVE (non-completed) tasks"
  // NOT literally all tasks. Completed tasks are UI-controlled via
  // collapsible section, not part of filter system.
  if (filter === 'all') {
    return tasks.filter(task => !task.completed);
  }
  
  // TICKET 17A FINAL: 'completed' filter shows only completed tasks
  if (filter === 'completed') {
    return tasks.filter(task => task.completed);
  }
  
  // For other filters: use timeClassification to categorize each task
  // Then filter to only tasks matching the requested category
  const categoryMap: Record<Exclude<TaskFilter, 'all' | 'completed'>, TaskTimeCategory> = {
    'today': 'today',
    'overdue': 'overdue',
    'upcoming': 'upcoming',
    'no-date': 'no_date',
  };
  
  const targetCategory = categoryMap[filter];
  
  // TICKET 17A HARDENING: Defensive check for invalid filter
  // Types protect us internally, but this prevents runtime issues
  // if filter comes from external source (e.g., URL params, API)
  if (!targetCategory) {
    console.warn(`[applyTaskFilter] Invalid filter "${filter}", defaulting to 'all'`);
    return tasks.filter(task => !task.completed);
  }
  
  return tasks.filter(task => {
    // Skip completed tasks (they're handled separately in UI)
    if (task.completed) {
      return false;
    }
    
    // Classify task and check if it matches target category
    const category = classifyTask(task);
    return category === targetCategory;
  });
}

/**
 * Get human-readable label for a filter
 * 
 * Used for UI display (e.g., section headers, breadcrumbs)
 * 
 * TICKET 17A HARDENING: Exhaustiveness check ensures new filters
 * cannot be added without updating this function.
 * 
 * @param filter - TaskFilter to get label for
 * @returns Display string for the filter
 */
export function getFilterLabel(filter: TaskFilter): string {
  switch (filter) {
    case 'all':
      return 'All Tasks';
    case 'today':
      return 'Today';
    case 'overdue':
      return 'Overdue';
    case 'upcoming':
      return 'Upcoming';
    case 'no-date':
      return 'No Date';
    case 'completed':
      return 'Completed';
    default: {
      // TICKET 17A HARDENING: Exhaustiveness check
      // If a new TaskFilter is added, TypeScript will error here
      // until this switch is updated. This prevents silent bugs.
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

/**
 * Check if a filter would return any tasks
 * 
 * Useful for conditionally showing/hiding filter buttons in UI
 * 
 * @param tasks - Array of tasks to check
 * @param filter - Filter to test
 * @returns true if filter would return at least one task
 */
export function hasTasksForFilter(
  tasks: Task[],
  filter: TaskFilter
): boolean {
  return applyTaskFilter(tasks, filter).length > 0;
}
