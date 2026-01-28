import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import type { 
  Task, List, Note, Checklist, ChecklistItem, ChecklistWithStats,
  CreateNote, UpdateNote, CreateChecklist, UpdateChecklist, CreateChecklistItem, UpdateChecklistItem 
} from '../types/models';

export interface TaskWithListName extends Task {
  list_name?: string;
}

/**
 * Get all tasks for a specific list
 * Returns tasks sorted by: completed status → priority → created date
 * 
 * VERSION 2: Updated to query entries table with type filter
 */
export async function getTasksByListId(listId: string): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM entries 
     WHERE list_id = ? AND type = 'task' AND deleted_at IS NULL 
     ORDER BY completed ASC, calm_priority ASC, created_at DESC`,
    [listId]
  );
  
  return rows.map(row => ({
    id: row.id,
    type: 'task' as const,
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
 * Soft-delete a list and all its entries
 * 
 * VERSION 2: Updated to reference entries table
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

    // Soft-delete all entries in this list (tasks, notes, checklists)
    await db.runAsync(
      `UPDATE entries
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

// ========== TASK OPERATIONS ==========

/**
 * Create a new task
 * 
 * VERSION 2: Updated to insert into entries table with type='task'
 */
export async function createTask(input: {
  title: string;
  list_id: string;
  due_date?: number;
  calm_priority?: number;
}): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO entries (
      id,
      type,
      title,
      list_id,
      due_date,
      calm_priority,
      completed,
      created_at,
      updated_at
    ) VALUES (?, 'task', ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
    [
      Crypto.randomUUID(),
      input.title,
      input.list_id,
      input.due_date ?? null,
      input.calm_priority ?? 2,
    ]
  );
}

/**
 * Update task (supports completion toggle, title edit, due date, and priority)
 * 
 * VERSION 2: Updated to query entries table with type filter
 */
export async function updateTask(input: {
  id: string;
  completed?: boolean;
  title?: string;
  due_date?: number | null;
  calm_priority?: number;
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

  if (input.calm_priority !== undefined) {
    updates.push('calm_priority = ?');
    values.push(input.calm_priority);
  }

  // Always update the updated_at timestamp
  updates.push("updated_at = datetime('now')");

  // Add the id at the end for WHERE clause
  values.push(input.id);

  await db.runAsync(
    `UPDATE entries
     SET ${updates.join(', ')}
     WHERE id = ? AND type = 'task'`,
    values
  );
}

/**
 * Soft-delete a task
 * 
 * VERSION 2: Updated to reference entries table with type filter
 */
export async function deleteTask(taskId: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE entries
     SET deleted_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ? AND type = 'task'`,
    [taskId]
  );
}

/**
 * Get all active tasks across all lists
 * Includes list name via JOIN
 * 
 * VERSION 2: Updated to query entries table with type filter
 */
export async function getAllActiveTasks(): Promise<TaskWithListName[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT 
      t.*,
      l.name as list_name
     FROM entries t
     LEFT JOIN lists l ON t.list_id = l.id
     WHERE t.type = 'task' AND t.deleted_at IS NULL
     ORDER BY t.completed ASC, t.created_at DESC`
  );
  
  return rows.map(row => ({
    id: row.id,
    type: 'task' as const,
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

// ========== NOTE OPERATIONS ==========

/**
 * Create a new note
 * 
 * VERSION 2.1: First non-task entry type (Ticket 8B)
 */
export async function createNote(input: CreateNote): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO entries (
      id,
      type,
      title,
      notes,
      list_id,
      created_at,
      updated_at
    ) VALUES (?, 'note', ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      Crypto.randomUUID(),
      input.title,
      input.notes ?? null,
      input.list_id ?? null,
    ]
  );
}

/**
 * Update note (title and/or body)
 */
export async function updateNote(input: UpdateNote): Promise<void> {
  const db = await getDatabase();

  const updates: string[] = [];
  const values: any[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }

  if (input.notes !== undefined) {
    updates.push('notes = ?');
    values.push(input.notes);
  }

  // Always update the updated_at timestamp
  updates.push("updated_at = datetime('now')");

  // Add the id at the end for WHERE clause
  values.push(input.id);

  await db.runAsync(
    `UPDATE entries
     SET ${updates.join(', ')}
     WHERE id = ? AND type = 'note'`,
    values
  );
}

/**
 * Soft-delete a note
 */
export async function deleteNote(noteId: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE entries
     SET deleted_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ? AND type = 'note'`,
    [noteId]
  );
}

/**
 * Get all notes for a specific list
 */
export async function getNotesByListId(listId: string): Promise<Note[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM entries 
     WHERE list_id = ? AND type = 'note' AND deleted_at IS NULL 
     ORDER BY created_at DESC`,
    [listId]
  );
  
  return rows.map(row => ({
    id: row.id,
    type: 'note' as const,
    title: row.title,
    notes: row.notes,
    list_id: row.list_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  }));
}

// ========== CHECKLIST OPERATIONS (REDESIGNED) ==========

/**
 * Create checklist with items atomically
 * 
 * VERSION 2.2: Redesigned checklist as container (Ticket 8C Redesign)
 * 
 * Creates both the checklist entry and all items in a single transaction.
 * This is the PRIMARY creation method for checklists.
 * 
 * @param input.title - Checklist title
 * @param input.list_id - Parent list ID
 * @param input.items - Array of item titles (strings)
 * @returns The created checklist ID
 */
export async function createChecklistWithItems(input: {
  title: string;
  list_id?: string;
  items: string[];
}): Promise<string> {
  const db = await getDatabase();
  const checklistId = Crypto.randomUUID();

  await db.execAsync('BEGIN TRANSACTION;');

  try {
    // 1. Create checklist entry
    await db.runAsync(
      `INSERT INTO entries (
        id,
        type,
        title,
        list_id,
        created_at,
        updated_at
      ) VALUES (?, 'checklist', ?, ?, datetime('now'), datetime('now'))`,
      [checklistId, input.title, input.list_id ?? null]
    );

    // 2. Create all checklist items
    for (const itemTitle of input.items) {
      if (itemTitle.trim()) {  // Skip empty items
        await db.runAsync(
          `INSERT INTO checklist_items (
            id,
            checklist_id,
            title,
            checked,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, 0, datetime('now'), datetime('now'))`,
          [Crypto.randomUUID(), checklistId, itemTitle.trim()]
        );
      }
    }

    await db.execAsync('COMMIT;');
    return checklistId;
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

/**
 * Update checklist (title only)
 */
export async function updateChecklist(input: UpdateChecklist): Promise<void> {
  const db = await getDatabase();

  const updates: string[] = [];
  const values: any[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }

  // Always update the updated_at timestamp
  updates.push("updated_at = datetime('now')");

  // Add the id at the end for WHERE clause
  values.push(input.id);

  await db.runAsync(
    `UPDATE entries
     SET ${updates.join(', ')}
     WHERE id = ? AND type = 'checklist'`,
    values
  );
}

/**
 * Soft-delete a checklist and all its items
 * 
 * Cascades to checklist_items table
 */
export async function deleteChecklist(checklistId: string): Promise<void> {
  const db = await getDatabase();

  await db.execAsync('BEGIN TRANSACTION;');

  try {
    // Soft-delete checklist entry
    await db.runAsync(
      `UPDATE entries
       SET deleted_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND type = 'checklist'`,
      [checklistId]
    );

    // Soft-delete all checklist items
    await db.runAsync(
      `UPDATE checklist_items
       SET deleted_at = datetime('now'), updated_at = datetime('now')
       WHERE checklist_id = ? AND deleted_at IS NULL`,
      [checklistId]
    );

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

/**
 * Get all checklists for a specific list WITH completion statistics
 * 
 * Returns ChecklistWithStats[] including checked_count and total_count
 * Used for displaying progress in ListsScreen
 */
export async function getChecklistsByListId(listId: string): Promise<ChecklistWithStats[]> {
  const db = await getDatabase();
  
  const rows = await db.getAllAsync<any>(
    `SELECT 
      e.*,
      COUNT(ci.id) as total_count,
      SUM(CASE WHEN ci.checked = 1 THEN 1 ELSE 0 END) as checked_count
     FROM entries e
     LEFT JOIN checklist_items ci ON e.id = ci.checklist_id AND ci.deleted_at IS NULL
     WHERE e.list_id = ? AND e.type = 'checklist' AND e.deleted_at IS NULL
     GROUP BY e.id
     ORDER BY e.created_at DESC`,
    [listId]
  );
  
  return rows.map(row => ({
    id: row.id,
    type: 'checklist' as const,
    title: row.title,
    list_id: row.list_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    checked_count: row.checked_count || 0,
    total_count: row.total_count || 0,
  }));
}

/**
 * Get single checklist by ID
 */
export async function getChecklist(checklistId: string): Promise<Checklist | null> {
  const db = await getDatabase();
  
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM entries 
     WHERE id = ? AND type = 'checklist' AND deleted_at IS NULL`,
    [checklistId]
  );
  
  if (!row) return null;
  
  return {
    id: row.id,
    type: 'checklist' as const,
    title: row.title,
    list_id: row.list_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

// ========== CHECKLIST ITEM OPERATIONS ==========

/**
 * Get all items for a checklist
 */
export async function getChecklistItems(checklistId: string): Promise<ChecklistItem[]> {
  const db = await getDatabase();
  
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM checklist_items 
     WHERE checklist_id = ? AND deleted_at IS NULL 
     ORDER BY created_at ASC`,
    [checklistId]
  );
  
  return rows.map(row => ({
    id: row.id,
    checklist_id: row.checklist_id,
    title: row.title,
    checked: row.checked === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  }));
}

/**
 * Create a new checklist item
 * Used when adding items to existing checklist
 */
export async function createChecklistItem(input: CreateChecklistItem): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO checklist_items (
      id,
      checklist_id,
      title,
      checked,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, 0, datetime('now'), datetime('now'))`,
    [Crypto.randomUUID(), input.checklist_id, input.title]
  );
}

/**
 * Toggle checklist item checked state
 */
export async function toggleChecklistItem(itemId: string, currentChecked: boolean): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE checklist_items
     SET checked = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [currentChecked ? 0 : 1, itemId]
  );
}

/**
 * Update checklist item (title)
 */
export async function updateChecklistItem(input: UpdateChecklistItem): Promise<void> {
  const db = await getDatabase();

  const updates: string[] = [];
  const values: any[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }

  if (input.checked !== undefined) {
    updates.push('checked = ?');
    values.push(input.checked ? 1 : 0);
  }

  // Always update the updated_at timestamp
  updates.push("updated_at = datetime('now')");

  // Add the id at the end for WHERE clause
  values.push(input.id);

  await db.runAsync(
    `UPDATE checklist_items
     SET ${updates.join(', ')}
     WHERE id = ?`,
    values
  );
}

/**
 * Soft-delete a checklist item
 */
export async function deleteChecklistItem(itemId: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE checklist_items
     SET deleted_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
    [itemId]
  );
}
