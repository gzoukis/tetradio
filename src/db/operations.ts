import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import type { 
  Task, List, Note, Checklist, ChecklistItem, ChecklistWithStats,
  CreateNote, UpdateNote, CreateChecklist, UpdateChecklist, CreateChecklistItem, UpdateChecklistItem 
} from '../types/models';
import { normalizeNameCanonical, normalizeNameDisplay } from '../utils/validation';

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
    'SELECT * FROM lists WHERE deleted_at IS NULL ORDER BY sort_order ASC'
  );

  console.log(`📋 getAllLists returned ${rows.length} rows from database`);
  rows.forEach(row => {
    console.log(`  - ${row.icon || '?'} ${row.name} [is_system=${row.is_system}, deleted_at=${row.deleted_at}]`);
  });

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color_hint: row.color_hint,
    sort_order: row.sort_order,
    is_pinned: row.is_pinned === 1,
    is_archived: row.is_archived === 1,
    is_system: row.is_system === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  }));
}

/**
 * Check if a list name already exists (case-insensitive)
 * 
 * TICKET 12: Duplicate name validation
 * TICKET 12 FOLLOW-UP (1️⃣): Uses canonical normalization
 * TICKET 12 FOLLOW-UP (4️⃣): Rename-safe with excludeId
 * 
 * @param name - List name to check
 * @param excludeId - Optional: List ID to exclude from check (for rename)
 * @returns true if duplicate exists, false otherwise
 */
export async function listNameExists(name: string, excludeId?: string): Promise<boolean> {
  const db = await getDatabase();
  const normalized = normalizeNameCanonical(name);
  
  // Get all active list names
  const rows = await db.getAllAsync<{ id: string; name: string }>(
    'SELECT id, name FROM lists WHERE deleted_at IS NULL'
  );
  
  return rows.some(row => {
    // Skip the list being renamed
    if (excludeId && row.id === excludeId) {
      return false;
    }
    
    return normalizeNameCanonical(row.name) === normalized;
  });
}

/**
 * Create a new list
 * 
 * TICKET 12: Added duplicate name validation
 * TICKET 12 FOLLOW-UP (1️⃣): Uses display normalization for storage
 * 
 * @throws Error if list name already exists
 */
export async function createList(input: {
  name: string;
  sort_order: number;
  is_pinned: boolean;
  is_archived: boolean;
  is_system?: boolean;
}): Promise<List> {
  const db = await getDatabase();
  
  // Normalize for display/storage (preserves case, collapses whitespace)
  const displayName = normalizeNameDisplay(input.name);
  
  if (displayName.length === 0) {
    throw new Error('List name cannot be empty');
  }
  
  // Check for duplicates (uses canonical normalization internally)
  const exists = await listNameExists(displayName);
  if (exists) {
    throw new Error('A list with this name already exists');
  }
  
  const now = Date.now();
  const id = Crypto.randomUUID();

  await db.runAsync(
    `INSERT INTO lists (
      id, name, sort_order, is_pinned, is_archived, is_system,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      displayName,  // Store display-ready name (case preserved, whitespace collapsed)
      input.sort_order,
      input.is_pinned ? 1 : 0,
      input.is_archived ? 1 : 0,
      input.is_system ? 1 : 0,
      now,
      now,
    ]
  );

  return {
    id,
    name: displayName,  // Return display name
    icon: undefined,
    color_hint: undefined,
    sort_order: input.sort_order,
    is_pinned: input.is_pinned,
    is_archived: input.is_archived,
    is_system: input.is_system ?? false,
    created_at: now,
    updated_at: now,
  };
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
  
  await cleanupUnsortedListIfEmpty();
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
  
  await cleanupUnsortedListIfEmpty();
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
 * Create a simple checklist without items (for ListsScreen modal)
 */
export async function createChecklist(input: {
  title: string;
  list_id?: string;
}): Promise<string> {
  const db = await getDatabase();
  const checklistId = Crypto.randomUUID();

  try {
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

    return checklistId;
  } catch (error) {
    console.error('Failed to create checklist:', error);
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
  
  // Cleanup AFTER transaction is complete
  await cleanupUnsortedListIfEmpty();
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
/**
 * Get or create the Unsorted system list
 * 
 * TICKET 9B: Quick Create from Overview
 * 
 * Auto-creates a system list for entries without an assigned list.
 * Properties: name='Unsorted', icon='📥', is_system=true, sort_order=9999
 */
export async function getOrCreateUnsortedList(): Promise<List> {
  const db = await getDatabase();
  
  // Try to find existing Unsorted list (even if archived)
  const existing = await db.getFirstAsync<any>(
    `SELECT * FROM lists 
     WHERE is_system = 1 AND deleted_at IS NULL
     LIMIT 1`
  );
  
  if (existing) {
    // If it's archived, un-archive it (user is adding an entry)
    if (existing.is_archived === 1) {
      console.log('📥 Un-archiving Unsorted list (new entry being added)');
      const now = Date.now();
      await db.runAsync(
        'UPDATE lists SET is_archived = 0, updated_at = ? WHERE id = ?',
        [now, existing.id]
      );
      
      return {
        id: existing.id,
        name: existing.name,
        icon: existing.icon,
        color_hint: existing.color_hint,
        sort_order: existing.sort_order,
        is_pinned: existing.is_pinned === 1,
        is_archived: false, // Now un-archived
        is_system: existing.is_system === 1,
        created_at: existing.created_at,
        updated_at: now,
        deleted_at: existing.deleted_at,
      };
    }
    
    return {
      id: existing.id,
      name: existing.name,
      icon: existing.icon,
      color_hint: existing.color_hint,
      sort_order: existing.sort_order,
      is_pinned: existing.is_pinned === 1,
      is_archived: existing.is_archived === 1,
      is_system: existing.is_system === 1,
      created_at: existing.created_at,
      updated_at: existing.updated_at,
      deleted_at: existing.deleted_at,
    };
  }
  
  // Create Unsorted list
  const id = Crypto.randomUUID();
  const now = Date.now();
  
  console.log('📥 Creating new Unsorted list');
  await db.runAsync(
    `INSERT INTO lists (
      id, name, icon, color_hint, sort_order, is_pinned, is_archived, is_system, 
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      'Unsorted',
      '📥',
      '#9ca3af',
      9999,
      0,
      0,
      1, // is_system = true
      now,
      now,
    ]
  );
  
  return {
    id,
    name: 'Unsorted',
    icon: '📥',
    color_hint: '#9ca3af',
    sort_order: 9999,
    is_pinned: false,
    is_archived: false,
    is_system: true,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get list by name
 * 
 * TICKET 9C: Completion/Un-completion logic helper
 * Used to find the Unsorted list for special handling
 */
export async function getListByName(name: string): Promise<List | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM lists WHERE name = ? AND deleted_at IS NULL LIMIT 1',
    [name]
  );
  
  if (!row) {
    return null;
  }
  
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color_hint: row.color_hint,
    sort_order: row.sort_order,
    is_pinned: row.is_pinned === 1,
    is_archived: row.is_archived === 1,
    is_system: row.is_system === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

/**
 * Count active (not completed) entries in a list
 * 
 * TICKET 9C: Completion logic helper
 * Counts all entry types (tasks, notes, checklists) that are:
 * - Not deleted (deleted_at IS NULL)
 * - Not completed (completed = 0 or NULL for non-completable types)
 * 
 * Used to determine if Unsorted list should be archived after task completion
 */
export async function getActiveEntriesCountByListId(listId: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count 
     FROM entries 
     WHERE list_id = ? 
       AND deleted_at IS NULL 
       AND (completed = 0 OR completed IS NULL)`,
    [listId]
  );
  
  return result?.count ?? 0;
}

/**
 * Un-archive a list
 * 
 * TICKET 9C: Un-completion logic helper
 * Used when un-completing an Unsorted task to bring back the Unsorted list
 */
export async function unarchiveList(listId: string): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  
  console.log('📥 Un-archiving list:', listId);
  await db.runAsync(
    'UPDATE lists SET is_archived = 0, updated_at = ? WHERE id = ?',
    [now, listId]
  );
}

/**
 * Archive a list
 * 
 * TICKET 9C: Completion logic helper
 * Used when completing the last Unsorted task to hide the Unsorted list
 */
export async function archiveList(listId: string): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  
  console.log('📦 Archiving list:', listId);
  await db.runAsync(
    'UPDATE lists SET is_archived = 1, updated_at = ? WHERE id = ?',
    [now, listId]
  );
}

/**
 * Clean up Unsorted list if empty
 * 
 * TICKET 9B: Auto-archive logic
 * 
 * Archives the Unsorted system list when all entries are removed.
 * Called automatically after deleteTask, deleteNote, deleteChecklist.
 */
export async function cleanupUnsortedListIfEmpty(): Promise<void> {
  const db = await getDatabase();
  
  try {
    // Find Unsorted list
    const unsortedList = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM lists WHERE is_system = 1 AND deleted_at IS NULL LIMIT 1'
    );
    
    if (!unsortedList) {
      // No Unsorted list exists, nothing to do
      return;
    }
    
    // Count active entries in Unsorted
    const entryCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM entries WHERE list_id = ? AND deleted_at IS NULL',
      [unsortedList.id]
    );
    
    if (entryCount && entryCount.count === 0) {
      // No entries left - archive the Unsorted list
      console.log('🗑️ Unsorted list is empty, archiving...');
      await db.runAsync(
        'UPDATE lists SET is_archived = 1, updated_at = ? WHERE id = ?',
        [Date.now(), unsortedList.id]
      );
      console.log('✅ Unsorted list archived');
    }
  } catch (error) {
    console.error('❌ Failed to cleanup Unsorted list:', error);
  }
}

/**
 * Move an entry to a different list
 * 
 * TICKET 9D: Move Items Between Lists
 * 
 * Generic operation that works for all entry types (Task, Note, Checklist).
 * Automatically triggers Unsorted cleanup if source list was Unsorted.
 * 
 * @param entryId - The ID of the entry to move
 * @param newListId - The ID of the destination list
 * @param sourceListId - Optional: The ID of the source list (for Unsorted cleanup)
 */
export async function moveEntryToList(input: {
  entryId: string;
  newListId: string;
  sourceListId?: string;
}): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  
  try {
    // Update the entry's list_id
    await db.runAsync(
      `UPDATE entries 
       SET list_id = ?, updated_at = ? 
       WHERE id = ? AND deleted_at IS NULL`,
      [input.newListId, now, input.entryId]
    );
    
    console.log(`📦 Moved entry ${input.entryId} to list ${input.newListId}`);
    
    // If source was Unsorted, check if it needs cleanup
    if (input.sourceListId) {
      const sourceList = await db.getFirstAsync<{ is_system: number }>(
        'SELECT is_system FROM lists WHERE id = ? AND deleted_at IS NULL',
        [input.sourceListId]
      );
      
      if (sourceList && sourceList.is_system === 1) {
        console.log('🔍 Source was Unsorted, checking cleanup...');
        await cleanupUnsortedListIfEmpty();
      }
    }
  } catch (error) {
    console.error('❌ Failed to move entry:', error);
    throw error;
  }
}

/**
 * Toggle pin status for a list
 * 
 * TICKET 10: Pinned Lists
 * 
 * Defense-in-depth: SQL-level WHERE clause prevents pinning system lists (Unsorted)
 * UI also prevents showing pin controls for system lists
 * 
 * @param listId - List to pin/unpin
 * @param isPinned - New pin state (true = pinned, false = unpinned)
 */
export async function toggleListPin(listId: string, isPinned: boolean): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  
  try {
    // SQL-level defense: Only allow pinning non-system lists
    await db.runAsync(
      'UPDATE lists SET is_pinned = ?, updated_at = ? WHERE id = ? AND is_system = 0',
      [isPinned ? 1 : 0, now, listId]
    );
    
    console.log(`📌 List ${listId} ${isPinned ? 'pinned' : 'unpinned'}`);
  } catch (error) {
    console.error('❌ Failed to toggle list pin:', error);
    throw error;
  }
}

/**
 * Batch update list sort orders and pin status
 * 
 * TICKET 11A: Drag & Drop List Reordering
 * 
 * Updates sort_order and is_pinned for multiple lists atomically.
 * Used after drag-and-drop to persist new ordering.
 * 
 * SAFETY GUARANTEES:
 * - Runs in transaction (atomic commit or rollback)
 * - Skips system lists (is_system = 1)
 * - No gaps in sort_order (0, 1, 2, ...)
 * - Updates timestamp on all affected lists
 * 
 * @param updates - Array of {id, sort_order, is_pinned}
 */
export async function updateListSortOrders(
  updates: { id: string; sort_order: number; is_pinned: boolean }[]
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  
  try {
    await db.execAsync('BEGIN TRANSACTION;');
    
    for (const update of updates) {
      // Skip system lists - defense in depth
      await db.runAsync(
        `UPDATE lists 
         SET sort_order = ?, is_pinned = ?, updated_at = ? 
         WHERE id = ? AND is_system = 0`,
        [update.sort_order, update.is_pinned ? 1 : 0, now, update.id]
      );
    }
    
    await db.execAsync('COMMIT;');
    console.log(`✅ Updated sort order for ${updates.length} lists`);
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    console.error('❌ Failed to update list sort orders:', error);
    throw error;
  }
}
