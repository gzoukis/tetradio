/**
 * SQLite schema definitions for Tetradio v1
 * 
 * Design Principles:
 * - Local-first: All data stored on device
 * - Soft deletes: deleted_at timestamp (30-day recovery)
 * - UUIDs: Client-side generation for future sync
 * - Timestamps: Full audit trail (created_at, updated_at)
 * - Optional fields: Nullable for forgiveness
 * - No AI fields in main schema (separate intelligence tables for future)
 */

export const SCHEMA_VERSION = 1;

/**
 * Tasks Table
 * Core task/todo functionality
 */
export const CREATE_TASKS_TABLE = `
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
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
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL
  );
`;

export const CREATE_TASKS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(list_id) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE deleted_at IS NULL AND completed = 0;
  CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed, completed_at) WHERE deleted_at IS NULL;
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
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
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
  CREATE_TASKS_TABLE,
  CREATE_TASKS_INDEXES,
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