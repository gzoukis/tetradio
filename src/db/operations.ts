import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import type { Task, List } from '../types/models';

export interface TaskWithListName extends Task {
  list_name?: string;
}

/**
 * Get all tasks for a specific list
 * Returns tasks sorted by: completed status → priority → created date
 */
export async function getTasksByListId(listId: string): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM tasks 
     WHERE list_id = ? AND deleted_at IS NULL 
     ORDER BY completed ASC, calm_priority ASC, created_at DESC`,
    [listId]
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

/**
 * Get all lists
 */
export async function getAllLists(): Promise<List[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM lists ORDER BY sort_order ASC'
  );

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    sort_order: row.sort_order,
    is_pinned: row.is_pinned === 1,
    is_archived: row.is_archived === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Create a new list
 */
export async function createList(input: {
  name: string;
  sort_order: number;
  is_pinned: boolean;
  is_archived: boolean;
}): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO lists (
      id,
      name,
      sort_order,
      is_pinned,
      is_archived,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      Crypto.randomUUID(),
      input.name,
      input.sort_order,
      input.is_pinned ? 1 : 0,
      input.is_archived ? 1 : 0,
    ]
  );
}

/**
 * Soft-delete a list and all its tasks
 */
export async function deleteList(listId: string): Promise<void> {
  const db = await getDatabase();

  // Use transaction to ensure atomicity
  await db.execAsync('BEGIN TRANSACTION;');
  
  try {
    // Soft-delete the list
    await db.runAsync(
      `UPDATE lists
       SET is_archived = 1, updated_at = datetime('now')
       WHERE id = ?`,
      [listId]
    );

    // Soft-delete all tasks in this list
    await db.runAsync(
      `UPDATE tasks
       SET deleted_at = datetime('now'), updated_at = datetime('now')
       WHERE list_id = ? AND deleted_at IS NULL`,
      [listId]
    );

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

/**
 * Create a new task
 */
export async function createTask(input: {
  title: string;
  list_id: string;
  due_date?: number;
  calm_priority?: number; // ADDED: Optional priority (defaults to 2)
}): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO tasks (
      id,
      title,
      list_id,
      due_date,
      calm_priority,
      completed,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
    [
      Crypto.randomUUID(),
      input.title,
      input.list_id,
      input.due_date ?? null,
      input.calm_priority ?? 2, // DEFAULT TO 2 (Normal)
    ]
  );
}

/**
 * Update task (supports completion toggle, title edit, due date, and priority)
 */
export async function updateTask(input: {
  id: string;
  completed?: boolean;
  title?: string;
  due_date?: number | null;
  calm_priority?: number; // ADDED: Optional priority update
}): Promise<void> {
  const db = await getDatabase();

  // Build dynamic update query based on provided fields
  const updates: string[] = [];
  const values: any[] = [];

  if (input.completed !== undefined) {
    updates.push('completed = ?');
    values.push(input.completed ? 1 : 0);
    
    if (input.completed) {
      updates.push("completed_at = datetime('now')");
    } else {
      updates.push('completed_at = NULL');
    }
  }

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }

  if (input.due_date !== undefined) {
    updates.push('due_date = ?');
    values.push(input.due_date);
  }

  // ADDED: Priority update
  if (input.calm_priority !== undefined) {
    updates.push('calm_priority = ?');
    values.push(input.calm_priority);
  }

  // Always update the updated_at timestamp
  updates.push("updated_at = datetime('now')");

  // Add the id at the end for WHERE clause
  values.push(input.id);

  await db.runAsync(
    `UPDATE tasks
     SET ${updates.join(', ')}
     WHERE id = ?`,
    values
  );
}

/**
 * Soft-delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE tasks
     SET deleted_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
    [taskId]
  );
}

/**
 * Get all active tasks across all lists
 * Includes list name via JOIN
 */
export async function getAllActiveTasks(): Promise<TaskWithListName[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT 
      t.*,
      l.name as list_name
     FROM tasks t
     LEFT JOIN lists l ON t.list_id = l.id
     WHERE t.deleted_at IS NULL
     ORDER BY t.completed ASC, t.created_at DESC`
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
    list_name: row.list_name,
  }));
}