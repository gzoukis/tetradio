/**
 * Core domain model types
 * Mirror SQLite schema with TypeScript safety
 * 
 * VERSION 2 CHANGES (Ticket 8A):
 * - Added Entry base interface
 * - Added EntryType discriminator
 * - Task now extends Entry with type='task'
 * - Foundation for future entry types (note, checklist, record)
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
 * VERSION 2: 'task' and 'note' active
 * Future: 'checklist', 'record'
 */
export type EntryType = 'task' | 'note'; // | 'checklist' | 'record';

/**
 * Entry base interface
 * All entry types share these fields
 * 
 * VERSION 2: Foundation for multi-type architecture
 * 
 * FIELD USAGE BY TYPE:
 * - type, title, list_id, created_at, updated_at: ALL types
 * - notes: ALL types (optional extended content)
 * - deleted_at: ALL types (soft delete mechanism)
 * 
 * TYPE-SPECIFIC FIELDS:
 * - completed, completed_at, due_date: task, checklist ONLY
 * - calm_priority: task ONLY
 * - parent_task_id: task ONLY (legacy subtask feature)
 * - snoozed_until: task ONLY (legacy snooze feature)
 * 
 * LEGACY FIELDS (task-only, preserved from v1):
 * - parent_task_id: Subtask hierarchy (POWER feature, inactive)
 * - snoozed_until: Task snoozing (POWER feature, inactive)
 * 
 * These fields will remain NULL for all non-task entry types.
 * No assumptions are made that other entry types will use them.
 */
export interface Entry extends BaseModel {
  type: EntryType;
  title: string;
  notes?: string;
  list_id?: string;
  
  // Type-specific fields (nullable for types that don't use them)
  // Tasks + Checklists
  due_date?: number;
  completed?: boolean;
  completed_at?: number;
  
  // Tasks only
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
 * 
 * VERSION 2: First non-task entry type
 * 
 * USES:
 * - id, type='note', title, notes (body text), list_id
 * - created_at, updated_at, deleted_at
 * 
 * DOES NOT USE:
 * - completed, completed_at (notes are not completable)
 * - due_date (notes are not schedulable)
 * - calm_priority (notes don't have urgency)
 * - parent_task_id, snoozed_until (task-only legacy fields)
 */
export interface Note extends BaseModel {
  type: 'note';
  title: string;
  notes?: string;  // Body text (optional)
  list_id?: string;
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
export type UpdateList = Partial<Omit<List, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
export type UpdateListItem = Partial<Omit<ListItem, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
export type UpdateReminder = Partial<Omit<Reminder, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
export type UpdateBudgetCategory = Partial<Omit<BudgetCategory, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
export type UpdateExpense = Partial<Omit<Expense, 'id' | 'created_at' | 'deleted_at'>> & { id: string };