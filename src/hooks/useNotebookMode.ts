/**
 * useNotebookMode
 *
 * TICKET 18A — Notebook Identity System
 *
 * Global hook for reading and setting the notebook display mode.
 * Persists selection to the SQLite app_metadata table (same pattern
 * used for schema versioning throughout the app).
 *
 * ARCHITECTURE SAFETY:
 *   - Changing mode updates Context value only
 *   - Does NOT remount screens
 *   - Does NOT reset scroll position
 *   - Does NOT trigger loading states
 *   - Screens re-render their NotebookLayer only (lightweight)
 *
 * USAGE:
 *   // In App.tsx — provide
 *   const notebookMode = useNotebookMode();
 *   <NotebookModeContext.Provider value={notebookMode}>
 *
 *   // In any screen or component — consume
 *   const { mode, setMode } = useContext(NotebookModeContext);
 */

import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../db/database';
import type { NotebookMode } from '../components/NotebookLayer';

const METADATA_KEY = 'notebook_mode';
const DEFAULT_MODE: NotebookMode = 'abstract';

export interface NotebookModeValue {
  mode: NotebookMode;
  setMode: (mode: NotebookMode) => void;
  loaded: boolean;
}

export function useNotebookMode(): NotebookModeValue {
  const [mode, setModeState] = useState<NotebookMode>(DEFAULT_MODE);
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const db = await getDatabase();
        const result = await db.getFirstAsync<{ value: string }>(
          'SELECT value FROM app_metadata WHERE key = ?',
          [METADATA_KEY]
        );
        if (!cancelled && result?.value) {
          const saved = result.value as NotebookMode;
          if (saved === 'abstract' || saved === 'classic') {
            setModeState(saved);
          }
        }
      } catch {
        // app_metadata may not have the key yet — use default silently
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const setMode = useCallback(async (newMode: NotebookMode) => {
    // Update state immediately — no waiting for DB write
    setModeState(newMode);

    // Persist asynchronously
    try {
      const db = await getDatabase();
      await db.runAsync(
        'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
        [METADATA_KEY, newMode]
      );
    } catch (error) {
      console.error('Failed to persist notebook mode:', error);
    }
  }, []);

  return { mode, setMode, loaded };
}
