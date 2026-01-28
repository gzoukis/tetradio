/**
 * Core domain model types
 * Mirror SQLite schema with TypeScript safety
 * 
 * VERSION 2 CHANGES (Ticket 8A):
 * - Added Entry base interface
 * - Added EntryType discriminator
 * - Task now extends Entry with type='task'
 * - Foundation for future entry types
 * 
 * VERSION 2.1 CHANGES (Ticket 8B):
 * - Added Note type
 * 
 * VERSION 2.2 CHANGES (Ticket 8C REDESIGN):
 * - Added Checklist type (container, not completable)
 * - Added ChecklistItem type (separate table)
 */

/**
 * Base fields present on all models
 */
export interface BaseModel {
  id: string;
  created_at: number;
  updated_at: number;
  deleted_at?: number;
}

/**
 * Entry types supported by the system
 * VERSION 2.2: 'task', 'note', and 'checklist' active
 * Future: 'record'
 */
export type EntryType = 'task' | 'note' | 'checklist'; // | 'record';

/**
 * Entry base interface
 * All entry types share these fields
 */
export interface Entry extends BaseModel {
  type: EntryType;
  title: string;
  notes?: string;
  list_id?: string;
  
  // Type-specific fields (nullable for types that don't use them)
  // Tasks only
  due_date?: number;
  completed?: boolean;
  completed_at?: number;
  calm_priority?: 1 | 2 | 3;
  parent_task_id?: string;      // LEGACY: Task-only subtask hierarchy
  snoozed_until?: number;        // LEGACY: Task-only snooze feature
}

/**
 * Task model (Entry with type='task')
 * Maintains backward compatibility with existing code
 */
export interface Task extends BaseModel {
  type: 'task';
  title: string;
  notes?: string;
  due_date?: number;
  completed: boolean;
  completed_at?: number;
  calm_priority?: 1 | 2 | 3;
  list_id?: string;
  parent_task_id?: string;
  snoozed_until?: number;
}

/**
 * Note model (Entry with type='note')
 * Simple text-based entry type
 */
export interface Note extends BaseModel {
  type: 'note';
  title: string;
  notes?: string;  // Body text (optional)
  list_id?: string;
}

/**
 * Checklist model (Entry with type='checklist')
 * Container for grouped checklist items
 * 
 * VERSION 2.2: Redesigned as CONTAINER (NOT single completable item)
 * 
 * USES:
 * - id, type='checklist', title, list_id
 * - created_at, updated_at, deleted_at
 * 
 * DOES NOT USE:
 * - completed, completed_at (completion is DERIVED from items)
 * - due_date (checklists are not scheduled)
 * - calm_priority (checklists don't have priority)
 * - notes/body (checklist title only)
 * - parent_task_id, snoozed_until (task-only legacy fields)
 * 
 * DEFINITION:
 * A Checklist is a CONTAINER that groups multiple ChecklistItems.
 * It appears as a single row in ListsScreen.
 * Tapping opens ChecklistScreen showing all items.
 * Completion is derived: all items checked = checklist complete.
 */
export interface Checklist extends BaseModel {
  type: 'checklist';
  title: string;
  list_id?: string;
}

/**
 * ChecklistItem model
 * Individual item within a checklist
 * 
 * STORED IN: checklist_items table (separate from entries)
 * 
 * USES:
 * - id, checklist_id (FK to entries WHERE type='checklist')
 * - title (item text)
 * - checked (completion state)
 * - created_at, updated_at, deleted_at
 * 
 * RELATIONSHIP:
 * - Many ChecklistItems belong to one Checklist
 * - Deleting Checklist cascades to ChecklistItems
 */
export interface ChecklistItem extends BaseModel {
  checklist_id: string;
  title: string;
  checked: boolean;
}

/**
 * Checklist with derived completion statistics
 * Used for display in ListsScreen
 */
export interface ChecklistWithStats extends Checklist {
  checked_count: number;
  total_count: number;
}

/**
 * List model
 */
export interface List extends BaseModel {
  name: string;
  icon?: string;
  color_hint?: string;
  sort_order: number;
  is_pinned: boolean;
  is_archived: boolean;
}

/**
 * List Item model
 */
export interface ListItem {
  id: string;
  list_id: string;
  text: string;
  checked: boolean;
  checked_at?: number;
  position: number;
  created_at: number;
  deleted_at?: number;
}

/**
 * Reminder model
 */
export interface Reminder extends BaseModel {
  title: string;
  trigger_time: number;
  is_dismissed: boolean;
  dismissed_at?: number;
  repeat_rule?: string;
  snooze_minutes?: number;
  location?: string;
  location_radius?: number;
  task_id?: string;
}

/**
 * Budget Category model
 */
export interface BudgetCategory extends BaseModel {
  name: string;
  icon?: string;
  color_hint?: string;
  parent_category_id?: string;
  sort_order: number;
  is_archived: boolean;
  monthly_limit?: number;
  limit_currency: string;
}

/**
 * Expense model
 */
export interface Expense extends BaseModel {
  amount: number;
  currency: string;
  transaction_date: number;
  note?: string;
  category_id?: string;
  merchant_name?: string;
  payment_method?: string;
  receipt_photo_path?: string;
}

/**
 * Create payload types (omit auto-generated fields)
 */
export type CreateTask = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'type'>;
export type CreateNote = Omit<Note, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'type'>;
export type CreateChecklist = Omit<Checklist, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'type'>;
export type CreateChecklistItem = Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type CreateList = Omit<List, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type CreateListItem = Omit<ListItem, 'id' | 'created_at' | 'deleted_at'>;
export type CreateReminder = Omit<Reminder, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type CreateBudgetCategory = Omit<BudgetCategory, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type CreateExpense = Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

/**
 * Update payload types (all fields optional except id)
 */
export type UpdateTask = Partial<Omit<Task, 'id' | 'created_at' | 'deleted_at' | 'type'>> & { id: string };
export type UpdateNote = Partial<Omit<Note, 'id' | 'created_at' | 'deleted_at' | 'type'>> & { id: string };
export type UpdateChecklist = Partial<Omit<Checklist, 'id' | 'created_at' | 'deleted_at' | 'type'>> & { id: string };
export type UpdateChecklistItem = Partial<Omit<ChecklistItem, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
export type UpdateList = Partial<Omit<List, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
export type UpdateListItem = Partial<Omit<ListItem, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
export type UpdateReminder = Partial<Omit<Reminder, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
export type UpdateBudgetCategory = Partial<Omit<BudgetCategory, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
export type UpdateExpense = Partial<Omit<Expense, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
