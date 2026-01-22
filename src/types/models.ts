/**
 * Core domain model types
 * Mirror SQLite schema with TypeScript safety
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
 * Task model
 */
export interface Task extends BaseModel {
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
export type CreateTask = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type CreateList = Omit<List, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type CreateListItem = Omit<ListItem, 'id' | 'created_at' | 'deleted_at'>;
export type CreateReminder = Omit<Reminder, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type CreateBudgetCategory = Omit<BudgetCategory, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type CreateExpense = Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

/**
 * Update payload types (all fields optional except id)
 */
export type UpdateTask = Partial<Omit<Task, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
export type UpdateList = Partial<Omit<List, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
export type UpdateListItem = Partial<Omit<ListItem, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
export type UpdateReminder = Partial<Omit<Reminder, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
export type UpdateBudgetCategory = Partial<Omit<BudgetCategory, 'id' | 'created_at' | 'deleted_at'>> & { id: string };
export type UpdateExpense = Partial<Omit<Expense, 'id' | 'created_at' | 'deleted_at'>> & { id: string };