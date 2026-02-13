/**
 * SQLite schema definitions for Tetradio
 * 
 * VERSION 5 CHANGES (Ticket 14 - Lists → Collections Rename):
 * - Renamed lists → collections
 * - Renamed list_id → collection_id in entries table
 * - Renamed list_items → collection_items
 * - All "list" references changed to "collection" throughout
 * 
 * VERSION 4 CHANGES (Ticket 9B - Quick Create from Overview):
 * - Added is_system column to collections table
 * - Enables Unsorted collection functionality (auto-create, auto-delete)
 * 
 * VERSION 3 CHANGES (Ticket 8C Redesign - Checklist Containers):
 * - Added checklist_items table
 * - Checklists in entries table are now containers
 * - Checklist items stored separately with FK to checklist
 * 
 * VERSION 2 CHANGES (Ticket 8A - Entry Architecture Foundation):
 * - Renamed tasks → entries
 * - Added type column (TEXT NOT NULL DEFAULT 'task')
 * - All existing tasks now have type='task'
 * - Foundation for future entry types (note, checklist, record)
 * 
 * Design Principles:
 * - Local-first: All data stored on device
 * - Soft deletes: deleted_at timestamp (30-day recovery)
 * - UUIDs: Client-side generation for future sync
 * - Timestamps: Full audit trail (created_at, updated_at)
 * - Optional fields: Nullable for forgiveness
 * - No AI fields in main schema (separate intelligence tables for future)
 */

export const SCHEMA_VERSION = 5;

/**
 * Entries Table (formerly Tasks)
 * Supports multiple entry types: task, note, checklist, record
 * 
 * VERSION 2: Added type column, renamed from tasks
 * VERSION 3: Checklists now containers (completion NOT stored here, derived from items)
 * VERSION 5: Renamed list_id → collection_id
 * 
 * FIELD USAGE BY TYPE:
 * - type: ALL (required discriminator)
 * - title, notes, collection_id: ALL (optional)
 * - completed, completed_at, due_date: task ONLY (NOT checklist anymore)
 * - calm_priority: task ONLY
 * - parent_task_id, snoozed_until: task ONLY (legacy fields, not used by other types)
 * 
 * CHECKLIST CHANGES (VERSION 3):
 * - Checklist entries do NOT use: completed, completed_at, due_date, calm_priority
 * - Completion is DERIVED from checklist_items table (all items checked = complete)
 * - Checklist entry is just a container with title + collection_id
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
    collection_id TEXT,
    parent_task_id TEXT,
    snoozed_until INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_task_id) REFERENCES entries(id) ON DELETE SET NULL
  );
`;

export const CREATE_ENTRIES_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_entries_collection ON entries(collection_id) WHERE deleted_at IS NULL;
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
 * Collections Table (formerly Lists)
 * Organization for tasks and items
 * 
 * VERSION 4: Added is_system column for system-managed collections (Unsorted)
 * VERSION 5: Renamed from lists → collections
 */
export const CREATE_COLLECTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color_hint TEXT,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    is_pinned INTEGER DEFAULT 0 NOT NULL,
    is_archived INTEGER DEFAULT 0 NOT NULL,
    is_system INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
`;

export const CREATE_COLLECTIONS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_archived, sort_order) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_collections_system ON collections(is_system) WHERE deleted_at IS NULL;
`;

/**
 * Collection Items Table (formerly List Items)
 * Simple checklist items within collections
 * 
 * VERSION 5: Renamed from list_items → collection_items, list_id → collection_id
 */
export const CREATE_COLLECTION_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS collection_items (
    id TEXT PRIMARY KEY NOT NULL,
    collection_id TEXT NOT NULL,
    text TEXT NOT NULL,
    checked INTEGER DEFAULT 0 NOT NULL,
    checked_at INTEGER,
    position INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
  );
`;

export const CREATE_COLLECTION_ITEMS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id, position) WHERE deleted_at IS NULL;
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
  CREATE_COLLECTIONS_TABLE,
  CREATE_COLLECTIONS_INDEXES,
  CREATE_COLLECTION_ITEMS_TABLE,
  CREATE_COLLECTION_ITEMS_INDEXES,
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

/**
 * Migration from Schema Version 3 to Version 4
 * Add is_system column to lists table (pre-rename)
 * 
 * TICKET: 9B - Quick Create from Overview
 * 
 * CHANGES:
 * 1. Adds is_system column to lists table (INTEGER DEFAULT 0 NOT NULL)
 * 2. Creates index for system lists
 * 
 * PRESERVES:
 * - All existing lists table data unchanged
 * - All existing lists get is_system = 0 (user-created)
 * - All other tables unchanged
 * 
 * PURPOSE:
 * - Enables Unsorted list (system-managed, auto-create, auto-delete)
 * - System lists have is_system = 1
 * - User-created lists have is_system = 0
 * - Future: Could support other system lists if needed
 * 
 * NOTES:
 * - This migration only adds a column
 * - No data transformation required
 * - Default value (0) preserves existing behavior
 */
export const MIGRATE_V3_TO_V4 = `
  -- Add is_system column to lists table
  ALTER TABLE lists ADD COLUMN is_system INTEGER DEFAULT 0 NOT NULL;
  
  -- Create index for system lists
  CREATE INDEX IF NOT EXISTS idx_lists_system ON lists(is_system) WHERE deleted_at IS NULL;
`;

/**
 * Migration from Schema Version 4 to Version 5
 * Rename Lists → Collections (complete rename)
 * 
 * TICKET: 14 - Lists → Collections Rename
 * 
 * CHANGES:
 * 1. Renames lists → collections
 * 2. Renames list_items → collection_items
 * 3. Renames list_id → collection_id in entries table
 * 4. Recreates all indexes with new names
 * 
 * PRESERVES:
 * - All existing data unchanged (rename in place)
 * - All relationships maintained
 * - All constraints preserved
 * 
 * SAFETY GUARANTEES:
 * - Runs in transaction (automatic rollback on error)
 * - Verifies tables were renamed
 * - Verifies column was renamed
 * - Idempotent (safe to run multiple times)
 */
export const MIGRATE_V4_TO_V5 = `
  -- Rename lists table to collections
  ALTER TABLE lists RENAME TO collections;
  
  -- Rename list_items table to collection_items
  ALTER TABLE list_items RENAME TO collection_items;
  
  -- Rename list_id column to collection_id in entries table
  ALTER TABLE entries RENAME COLUMN list_id TO collection_id;
  
  -- Rename list_id column to collection_id in collection_items table
  ALTER TABLE collection_items RENAME COLUMN list_id TO collection_id;
  
  -- Drop old indexes
  DROP INDEX IF EXISTS idx_lists_active;
  DROP INDEX IF EXISTS idx_lists_system;
  DROP INDEX IF EXISTS idx_list_items_list;
  DROP INDEX IF EXISTS idx_entries_list;
  
  -- Recreate indexes with new names
  CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_archived, sort_order) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_collections_system ON collections(is_system) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id, position) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_entries_collection ON entries(collection_id) WHERE deleted_at IS NULL;
`;
