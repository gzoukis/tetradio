import * as SQLite from 'expo-sqlite';
import { INIT_SCHEMA, SCHEMA_VERSION, MIGRATE_V1_TO_V2 } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Get current schema version from database
 * 
 * METADATA KEY: 'schema_version'
 * STORAGE TYPE: TEXT (string)
 * FORMAT: Integer as string (e.g., '1', '2', '3')
 */
async function getCurrentVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_metadata WHERE key = ?',
      ['schema_version']
    );
    return result ? parseInt(result.value, 10) : 0;
  } catch (error) {
    // app_metadata table doesn't exist yet (fresh install)
    return 0;
  }
}

/**
 * Update schema version in database
 * 
 * TIMING: Called ONLY after successful migration commit
 * STORAGE: app_metadata table, key='schema_version', value as TEXT
 */
async function updateVersion(db: SQLite.SQLiteDatabase, version: number): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
    ['schema_version', version.toString()]
  );
}

/**
 * Run migration from version 1 to version 2
 * Tasks → Entries with type column
 * 
 * SAFETY GUARANTEES:
 * - Runs in transaction (automatic rollback on error)
 * - Preserves ALL rows (active + soft-deleted)
 * - Verifies row counts before/after
 * - Verifies all rows have type='task'
 * - Idempotent (safe to run multiple times)
 */
async function migrateV1ToV2(db: SQLite.SQLiteDatabase): Promise<void> {
  console.log('Running migration: V1 → V2 (Tasks → Entries)');
  
  try {
    await db.execAsync('BEGIN TRANSACTION;');
    
    // Check if tasks table exists
    const tableExists = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='tasks'"
    );
    
    if (tableExists && tableExists.count > 0) {
      // Get count before migration (includes ALL rows: active + soft-deleted)
      const beforeCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM tasks'
      );
      console.log(`Tasks before migration: ${beforeCount?.count ?? 0}`);
      
      // Run migration SQL (add type column, rename table)
      await db.execAsync(MIGRATE_V1_TO_V2);
      
      // Verify count after migration (includes ALL rows: active + soft-deleted)
      const afterCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM entries WHERE type = ?',
        ['task']
      );
      console.log(`Entries after migration: ${afterCount?.count ?? 0}`);
      
      // CRITICAL: Verify ALL rows migrated (including soft-deleted)
      if (beforeCount?.count !== afterCount?.count) {
        throw new Error('Migration verification failed: row count mismatch');
      }
      
      // Verify all rows have type='task'
      const totalEntries = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM entries'
      );
      
      if (totalEntries?.count !== afterCount?.count) {
        throw new Error('Migration verification failed: not all entries have type=task');
      }
      
      console.log('Migration V1→V2 successful');
    } else {
      console.log('No tasks table found (fresh install), skipping migration');
    }
    
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    console.error('Migration V1→V2 failed:', error);
    throw error;
  }
}

/**
 * Initialize SQLite database with schema
 * Creates all tables and indexes, runs migrations if needed
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabaseAsync('tetradio.db');
  
  try {
    // Get current schema version
    const currentVersion = await getCurrentVersion(db);
    console.log(`Current schema version: ${currentVersion}`);
    console.log(`Target schema version: ${SCHEMA_VERSION}`);
    
    if (currentVersion === 0) {
      // Fresh install - create all tables
      console.log('Fresh install detected, creating schema...');
      
      await db.execAsync('BEGIN TRANSACTION;');
      
      for (const sql of INIT_SCHEMA) {
        await db.execAsync(sql);
      }
      
      // Create app_metadata table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS app_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      
      await updateVersion(db, SCHEMA_VERSION);
      await db.execAsync('COMMIT;');
      
      console.log('Schema created successfully');
    } else if (currentVersion < SCHEMA_VERSION) {
      // Run migrations
      console.log('Migrations needed');
      
      if (currentVersion < 2) {
        await migrateV1ToV2(db);
      }
      
      // Add future migrations here:
      // if (currentVersion < 3) { await migrateV2ToV3(db); }
      
      await updateVersion(db, SCHEMA_VERSION);
      console.log(`Schema updated to version ${SCHEMA_VERSION}`);
    } else {
      console.log('Schema up to date');
    }
    
    dbInstance = db;
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Get database instance
 * Must call initDatabase first
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    return await initDatabase();
  }
  return dbInstance;
}

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const db = await initDatabase();
    
    // Test query
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"'
    );
    
    // Should have at least our core tables
    return (result?.count ?? 0) >= 6;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Reset database (for development/testing only)
 * Drops all tables and recreates schema
 */
export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  
  await db.execAsync('BEGIN TRANSACTION;');
  
  try {
    // Drop all tables
    await db.execAsync('DROP TABLE IF EXISTS entries;');
    await db.execAsync('DROP TABLE IF EXISTS tasks;'); // In case old table exists
    await db.execAsync('DROP TABLE IF EXISTS lists;');
    await db.execAsync('DROP TABLE IF EXISTS list_items;');
    await db.execAsync('DROP TABLE IF EXISTS reminders;');
    await db.execAsync('DROP TABLE IF EXISTS budget_categories;');
    await db.execAsync('DROP TABLE IF EXISTS expenses;');
    await db.execAsync('DROP TABLE IF EXISTS app_metadata;');
    
    await db.execAsync('COMMIT;');
    
    // Reinitialize
    dbInstance = null;
    await initDatabase();
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}