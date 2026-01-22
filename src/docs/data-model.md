import * as SQLite from 'expo-sqlite';
import { INIT_SCHEMA, SCHEMA_VERSION } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize SQLite database with schema
 * Creates all tables and indexes
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabaseAsync('tetradio.db');
  
  // Run schema initialization
  try {
    await db.execAsync('BEGIN TRANSACTION;');
    
    for (const sql of INIT_SCHEMA) {
      await db.execAsync(sql);
    }
    
    // Store schema version
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    
    await db.runAsync(
      'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
      ['schema_version', SCHEMA_VERSION.toString()]
    );
    
    await db.execAsync('COMMIT;');
    
    dbInstance = db;
    return db;
  } catch (error) {
    await db.execAsync('ROLLBACK;');
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
    await db.execAsync('DROP TABLE IF EXISTS tasks;');
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