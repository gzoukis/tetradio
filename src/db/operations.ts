import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import type { Task, List } from '../types/models';

/**
 * Get all tasks for a specific list
 */
export async function getTasksByListId(listId: string): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM tasks WHERE list_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
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
 * Soft-delete a list
 */
export async function deleteList(listId: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE lists
     SET is_archived = 1, updated_at = datetime('now')
     WHERE id = ?`,
    [listId]
  );
}

/**
 * Create a new task
 */
export async function createTask(input: {
  title: string;
  list_id: string;
}): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO tasks (
      id,
      title,
      list_id,
      completed,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, 0, datetime('now'), datetime('now'))`,
    [
      Crypto.randomUUID(),
      input.title,
      input.list_id,
    ]
  );
}

/**
 * Update task (completion toggle)
 */
export async function updateTask(input: {
  id: string;
  completed: boolean;
}): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE tasks
     SET
       completed = ?,
       completed_at = ?,
       updated_at = datetime('now')
     WHERE id = ?`,
    [
      input.completed ? 1 : 0,
      input.completed ? "datetime('now')" : null,
      input.id,
    ]
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
