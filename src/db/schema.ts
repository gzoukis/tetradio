/**
 * SQLite schema definitions for Tetradio
 * 
 * VERSION 2 CHANGES (Ticket 8A - Entry Architecture Foundation):
 * - Renamed tasks → entries
 * - Added type column (TEXT NOT NULL DEFAULT 'task')
 * - All existing tasks now have type='task'
 * - Foundation for future entry types (note, checklist, record)
 * 
 * VERSION 3 CHANGES (Ticket 8C Redesign - Checklist Containers):
 * - Added checklist_items table
 * - Checklists in entries table are now containers
 * - Checklist items stored separately with FK to checklist
 * 
 * Design Principles:
 * - Local-first: All data stored on device
 * - Soft deletes: deleted_at timestamp (30-day recovery)
 * - UUIDs: Client-side generation for future sync
 * - Timestamps: Full audit trail (created_at, updated_at)
 * - Optional fields: Nullable for forgiveness
 * - No AI fields in main schema (separate intelligence tables for future)
 */

export const SCHEMA_VERSION = 3;

/**
 * Entries Table (formerly Tasks)
 * Supports multiple entry types: task, note, checklist, record
 * 
 * VERSION 2: Added type column, renamed from tasks
 * VERSION 3: Checklists now containers (completion NOT stored here, derived from items)
 * 
 * FIELD USAGE BY TYPE:
 * - type: ALL (required discriminator)
 * - title, notes, list_id: ALL (optional)
 * - completed, completed_at, due_date: task ONLY (NOT checklist anymore)
 * - calm_priority: task ONLY
 * - parent_task_id, snoozed_until: task ONLY (legacy fields, not used by other types)
 * 
 * CHECKLIST CHANGES (VERSION 3):
 * - Checklist entries do NOT use: completed, completed_at, due_date, calm_priority
 * - Completion is DERIVED from checklist_items table (all items checked = complete)
 * - Checklist entry is just a container with title + list_id
 * 
 * LEGACY FIELDS (task-only, unchanged from v1):
 * - parent_task_id: Subtask hierarchy (POWER feature, inactive in v1)
 * - snoozed_until: Task snoozing (POWER feature, inactive in v1)
 * 
 * SOFT DELETES:
 * - deleted_at IS NOT NULL marks soft-deleted entries
 * - Soft-deleted rows preserved during migration
 * - All queries filter WHERE deleted_at IS NULL
 */
export const CREATE_ENTRIES_TABLE = `
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL DEFAULT 'task',
    title TEXT NOT NULL,
    notes TEXT,
    due_date INTEGER,
    completed INTEGER DEFAULT 0 NOT NULL,
    completed_at INTEGER,
    calm_priority INTEGER CHECK(calm_priority IN (1, 2, 3)),
    list_id TEXT,
    parent_task_id TEXT,
    snoozed_until INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_task_id) REFERENCES entries(id) ON DELETE SET NULL
  );
`;

export const CREATE_ENTRIES_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_entries_list ON entries(list_id) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_entries_due_date ON entries(due_date) WHERE deleted_at IS NULL AND completed = 0;
  CREATE INDEX IF NOT EXISTS idx_entries_completed ON entries(completed, completed_at) WHERE deleted_at IS NULL;
`;

/**
 * Checklist Items Table
 * Individual items within a checklist container
 * 
 * VERSION 3: NEW TABLE (Ticket 8C Redesign)
 * 
 * RELATIONSHIP:
 * - Many checklist_items belong to one checklist (entries WHERE type='checklist')
 * - Foreign key: checklist_id → entries.id
 * - Cascade delete: Deleting checklist soft-deletes all items
 * 
 * COMPLETION LOGIC:
 * - Each item has checked field (0/1)
 * - Checklist completion is DERIVED: COUNT(checked=1) = COUNT(*) → complete
 * - Never stored in entries table
 * 
 * ORDERING:
 * - created_at ASC (items appear in creation order)
 * - No explicit position field (creation order is natural order)
 * 
 * SOFT DELETES:
 * - deleted_at timestamp for recovery
 * - Deleting checklist sets deleted_at on all items
 */
export const CREATE_CHECKLIST_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS checklist_items (
    id TEXT PRIMARY KEY NOT NULL,
    checklist_id TEXT NOT NULL,
    title TEXT NOT NULL,
    checked INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (checklist_id) REFERENCES entries(id) ON DELETE CASCADE
  );
`;

export const CREATE_CHECKLIST_ITEMS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON checklist_items(checklist_id) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_checklist_items_checked ON checklist_items(checklist_id, checked) WHERE deleted_at IS NULL;
`;

/**
 * Lists Table
 * Organization for tasks and items
 */
export const CREATE_LISTS_TABLE = `
  CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color_hint TEXT,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    is_pinned INTEGER DEFAULT 0 NOT NULL,
    is_archived INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
`;

export const CREATE_LISTS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_lists_active ON lists(is_archived, sort_order) WHERE deleted_at IS NULL;
`;

/**
 * List Items Table
 * Simple checklist items within lists
 */
export const CREATE_LIST_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS list_items (
    id TEXT PRIMARY KEY NOT NULL,
    list_id TEXT NOT NULL,
    text TEXT NOT NULL,
    checked INTEGER DEFAULT 0 NOT NULL,
    checked_at INTEGER,
    position INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
  );
`;

export const CREATE_LIST_ITEMS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_list_items_list ON list_items(list_id, position) WHERE deleted_at IS NULL;
`;

/**
 * Reminders Table
 * Time-based and location-based reminders
 */
export const CREATE_REMINDERS_TABLE = `
  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    trigger_time INTEGER NOT NULL,
    is_dismissed INTEGER DEFAULT 0 NOT NULL,
    dismissed_at INTEGER,
    repeat_rule TEXT,
    snooze_minutes INTEGER,
    location TEXT,
    location_radius REAL,
    task_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (task_id) REFERENCES entries(id) ON DELETE SET NULL
  );
`;

export const CREATE_REMINDERS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_reminders_trigger ON reminders(trigger_time) WHERE deleted_at IS NULL AND is_dismissed = 0;
  CREATE INDEX IF NOT EXISTS idx_reminders_task ON reminders(task_id) WHERE deleted_at IS NULL;
`;

/**
 * Budget Categories Table
 * Categories for expenses (and optionally tasks)
 */
export const CREATE_BUDGET_CATEGORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS budget_categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color_hint TEXT,
    parent_category_id TEXT,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    is_archived INTEGER DEFAULT 0 NOT NULL,
    monthly_limit REAL,
    limit_currency TEXT DEFAULT 'EUR',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (parent_category_id) REFERENCES budget_categories(id) ON DELETE SET NULL
  );
`;

export const CREATE_BUDGET_CATEGORIES_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_categories_active ON budget_categories(is_archived, sort_order) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_categories_parent ON budget_categories(parent_category_id) WHERE deleted_at IS NULL;
`;

/**
 * Expenses Table
 * Financial transactions and spending tracking
 */
export const CREATE_EXPENSES_TABLE = `
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    currency TEXT DEFAULT 'EUR' NOT NULL,
    transaction_date INTEGER NOT NULL,
    note TEXT,
    category_id TEXT,
    merchant_name TEXT,
    payment_method TEXT,
    receipt_photo_path TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE SET NULL
  );
`;

export const CREATE_EXPENSES_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(transaction_date) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(transaction_date) WHERE deleted_at IS NULL;
`;

/**
 * Complete schema initialization
 * Run all CREATE TABLE and CREATE INDEX statements
 */
export const INIT_SCHEMA = [
  CREATE_ENTRIES_TABLE,
  CREATE_ENTRIES_INDEXES,
  CREATE_CHECKLIST_ITEMS_TABLE,
  CREATE_CHECKLIST_ITEMS_INDEXES,
  CREATE_LISTS_TABLE,
  CREATE_LISTS_INDEXES,
  CREATE_LIST_ITEMS_TABLE,
  CREATE_LIST_ITEMS_INDEXES,
  CREATE_REMINDERS_TABLE,
  CREATE_REMINDERS_INDEXES,
  CREATE_BUDGET_CATEGORIES_TABLE,
  CREATE_BUDGET_CATEGORIES_INDEXES,
  CREATE_EXPENSES_TABLE,
  CREATE_EXPENSES_INDEXES,
];

/**
 * Migration from Schema Version 1 to Version 2
 * Tasks → Entries with type column
 * 
 * CHANGES:
 * 1. Adds type column (TEXT NOT NULL DEFAULT 'task')
 * 2. Renames tasks table to entries
 * 
 * PRESERVES:
 * - All existing data (including soft-deleted rows)
 * - All existing columns unchanged (parent_task_id, snoozed_until remain)
 * - All indexes recreated with new table name
 * 
 * VERIFICATION:
 * - Row count before = row count after (includes soft-deleted)
 * - All rows have type='task' after migration
 */
export const MIGRATE_V1_TO_V2 = `
  -- Add type column to existing tasks table
  ALTER TABLE tasks ADD COLUMN type TEXT NOT NULL DEFAULT 'task';
  
  -- Rename tasks table to entries
  ALTER TABLE tasks RENAME TO entries;
`;

/**
 * Migration from Schema Version 2 to Version 3
 * Add checklist_items table
 * 
 * CHANGES:
 * 1. Creates checklist_items table
 * 2. Creates indexes for checklist_items
 * 
 * PRESERVES:
 * - All existing entries table data unchanged
 * - Any existing type='checklist' entries remain (orphaned if created before this migration)
 * - All other tables unchanged
 * 
 * NOTES:
 * - This migration only adds a new table
 * - No data transformation required
 * - Old single-item checklists (if any exist) should be manually cleaned or migrated
 */
export const MIGRATE_V2_TO_V3 = [
  CREATE_CHECKLIST_ITEMS_TABLE,
  CREATE_CHECKLIST_ITEMS_INDEXES,
].join('\n');
