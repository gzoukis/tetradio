/**
 * NotebookModeContext
 *
 * TICKET 18A — Notebook Identity System
 *
 * React Context that distributes notebookMode to all screens without
 * prop drilling. Provided once in App.tsx, consumed in screens and
 * SettingsScreen toggle.
 *
 * Using Context (not prop drilling) ensures:
 *   - App.tsx doesn't need to thread `notebookMode` through every screen
 *   - Adding the toggle to Settings is self-contained
 *   - Future screens automatically get access
 */

import { createContext, useContext } from 'react';
import type { NotebookModeValue } from '../hooks/useNotebookMode';
import type { NotebookMode } from '../components/NotebookLayer';

const defaultValue: NotebookModeValue = {
  mode: 'abstract',
  setMode: () => {},
  loaded: false,
};

export const NotebookModeContext = createContext<NotebookModeValue>(defaultValue);

/**
 * Convenience hook — import this in screens instead of useContext directly
 *
 * Usage:
 *   const { mode, setMode } = useNotebookModeContext();
 */
export function useNotebookModeContext() {
  return useContext(NotebookModeContext);
}

export type { NotebookMode };
