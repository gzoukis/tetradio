import { getDatabase } from './database';
import { generateUUID, getCurrentTimestamp } from '../utils/uuid';
import type {
  Task, CreateTask, UpdateTask,
  List, CreateList, UpdateList,
  ListItem, CreateListItem, UpdateListItem,
  Reminder, CreateReminder, UpdateReminder,
  BudgetCategory, CreateBudgetCategory, UpdateBudgetCategory,
  Expense, CreateExpense, UpdateExpense,
} from '../types/models';

/**
 * TASKS CRUD
 */

export async function createTask(data: CreateTask): Promise<Task> {
  const db = await getDatabase();
  const now = getCurrentTimestamp();
  const id = generateUUID();
  
  const task: Task = {
    id,
    title: data.title,
    notes: data.notes,
    due_date: data.due_date,
    completed: data.completed ?? false,
    completed_at: data.completed_at,
    calm_priority: data.calm_priority,
    list_id: data.list_id,
    parent_task_id: data.parent_task_id,
    snoozed_until: data.snoozed_until,
    created_at: now,
    updated_at: now,
  };
  
  await db.runAsync(
    `INSERT INTO tasks (id, title, notes, due_date, completed, completed_at, 
     calm_priority, list_id, parent_task_id, snoozed_until, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [task.id, task.title, task.notes ?? null, task.due_date ?? null,
     task.completed ? 1 : 0, task.completed_at ?? null, task.calm_priority ?? null,
     task.list_id ?? null, task.parent_task_id ?? null, task.snoozed_until ?? null,
     task.created_at, task.updated_at]
  );
  
  return task;
}

export async function getTask(id: string): Promise<Task | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  
  if (!row) return null;
  
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    due_date: row.due_date,
    completed: row.completed === 1,
    completed_at: row.completed_at,
    calm_priority: row.calm_priority,
    list_id: row.list_id,
    parent_task_id: row.parent_task_id,
    snoozed_until: row.snoozed_until,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

export async function getAllTasks(): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY created_at DESC'
  );
  
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    notes: row.notes,
    due_date: row.due_date,
    completed: row.completed === 1,
    completed_at: row.completed_at,
    calm_priority: row.calm_priority,
    list_id: row.list_id,
    parent_task_id: row.parent_task_id,
    snoozed_until: row.snoozed_until,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  }));
}

export async function updateTask(data: UpdateTask): Promise<void> {
  const db = await getDatabase();
  const now = getCurrentTimestamp();
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.title !== undefined) {
    updates.push('title = ?');
    values.push(data.title);
  }
  if (data.notes !== undefined) {
    updates.push('notes = ?');
    values.push(data.notes ?? null);
  }
  if (data.due_date !== undefined) {
    updates.push('due_date = ?');
    values.push(data.due_date ?? null);
  }
  if (data.completed !== undefined) {
    updates.push('completed = ?');
    values.push(data.completed ? 1 : 0);
  }
  if (data.completed_at !== undefined) {
    updates.push('completed_at = ?');
    values.push(data.completed_at ?? null);
  }
  if (data.calm_priority !== undefined) {
    updates.push('calm_priority = ?');
    values.push(data.calm_priority ?? null);
  }
  if (data.list_id !== undefined) {
    updates.push('list_id = ?');
    values.push(data.list_id ?? null);
  }
  if (data.parent_task_id !== undefined) {
    updates.push('parent_task_id = ?');
    values.push(data.parent_task_id ?? null);
  }
  if (data.snoozed_until !== undefined) {
    updates.push('snoozed_until = ?');
    values.push(data.snoozed_until ?? null);
  }
  
  updates.push('updated_at = ?');
  values.push(now);
  
  values.push(data.id);
  
  await db.runAsync(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
    values
  );
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDatabase();
  const now = getCurrentTimestamp();
  
  await db.runAsync(
    'UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?',
    [now, now, id]
  );
}

/**
 * LISTS CRUD
 */

export async function createList(data: CreateList): Promise<List> {
  const db = await getDatabase();
  const now = getCurrentTimestamp();
  const id = generateUUID();
  
  const list: List = {
    id,
    name: data.name,
    icon: data.icon,
    color_hint: data.color_hint,
    sort_order: data.sort_order ?? 0,
    is_pinned: data.is_pinned ?? false,
    is_archived: data.is_archived ?? false,
    created_at: now,
    updated_at: now,
  };
  
  await db.runAsync(
    `INSERT INTO lists (id, name, icon, color_hint, sort_order, is_pinned, 
     is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [list.id, list.name, list.icon ?? null, list.color_hint ?? null,
     list.sort_order, list.is_pinned ? 1 : 0, list.is_archived ? 1 : 0,
     list.created_at, list.updated_at]
  );
  
  return list;
}

export async function getAllLists(): Promise<List[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM lists WHERE deleted_at IS NULL ORDER BY sort_order, created_at'
  );
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color_hint: row.color_hint,
    sort_order: row.sort_order,
    is_pinned: row.is_pinned === 1,
    is_archived: row.is_archived === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  }));
}

export async function deleteList(id: string): Promise<void> {
  const db = await getDatabase();
  const now = getCurrentTimestamp();
  
  await db.runAsync(
    'UPDATE lists SET deleted_at = ?, updated_at = ? WHERE id = ?',
    [now, now, id]
  );
}

/**
 * EXPENSES CRUD
 */

export async function createExpense(data: CreateExpense): Promise<Expense> {
  const db = await getDatabase();
  const now = getCurrentTimestamp();
  const id = generateUUID();
  
  const expense: Expense = {
    id,
    amount: data.amount,
    currency: data.currency ?? 'EUR',
    transaction_date: data.transaction_date ?? now,
    note: data.note,
    category_id: data.category_id,
    merchant_name: data.merchant_name,
    payment_method: data.payment_method,
    receipt_photo_path: data.receipt_photo_path,
    created_at: now,
    updated_at: now,
  };
  
  await db.runAsync(
    `INSERT INTO expenses (id, amount, currency, transaction_date, note, 
     category_id, merchant_name, payment_method, receipt_photo_path, 
     created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [expense.id, expense.amount, expense.currency, expense.transaction_date,
     expense.note ?? null, expense.category_id ?? null, expense.merchant_name ?? null,
     expense.payment_method ?? null, expense.receipt_photo_path ?? null,
     expense.created_at, expense.updated_at]
  );
  
  return expense;
}

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM expenses WHERE deleted_at IS NULL ORDER BY transaction_date DESC'
  );
  
  return rows.map(row => ({
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    transaction_date: row.transaction_date,
    note: row.note,
    category_id: row.category_id,
    merchant_name: row.merchant_name,
    payment_method: row.payment_method,
    receipt_photo_path: row.receipt_photo_path,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  }));
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDatabase();
  const now = getCurrentTimestamp();
  
  await db.runAsync(
    'UPDATE expenses SET deleted_at = ?, updated_at = ? WHERE id = ?',
    [now, now, id]
  );
}

/**
 * BUDGET CATEGORIES CRUD
 */

export async function createBudgetCategory(data: CreateBudgetCategory): Promise<BudgetCategory> {
  const db = await getDatabase();
  const now = getCurrentTimestamp();
  const id = generateUUID();
  
  const category: BudgetCategory = {
    id,
    name: data.name,
    icon: data.icon,
    color_hint: data.color_hint,
    parent_category_id: data.parent_category_id,
    sort_order: data.sort_order ?? 0,
    is_archived: data.is_archived ?? false,
    monthly_limit: data.monthly_limit,
    limit_currency: data.limit_currency ?? 'EUR',
    created_at: now,
    updated_at: now,
  };
  
  await db.runAsync(
    `INSERT INTO budget_categories (id, name, icon, color_hint, parent_category_id,
     sort_order, is_archived, monthly_limit, limit_currency, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [category.id, category.name, category.icon ?? null, category.color_hint ?? null,
     category.parent_category_id ?? null, category.sort_order, category.is_archived ? 1 : 0,
     category.monthly_limit ?? null, category.limit_currency, category.created_at, category.updated_at]
  );
  
  return category;
}

export async function getAllBudgetCategories(): Promise<BudgetCategory[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM budget_categories WHERE deleted_at IS NULL ORDER BY sort_order, created_at'
  );
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color_hint: row.color_hint,
    parent_category_id: row.parent_category_id,
    sort_order: row.sort_order,
    is_archived: row.is_archived === 1,
    monthly_limit: row.monthly_limit,
    limit_currency: row.limit_currency,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  }));
}