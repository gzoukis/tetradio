/**
 * Validation utilities for data integrity and user input
 * 
 * TICKET 12 FOLLOW-UP: Enhanced validation with canonical normalization
 * 
 * ARCHITECTURE PRINCIPLES:
 * 1. Canonical Form: Single source of truth for name normalization
 * 2. Separation of Concerns: Display name != Comparison name != Storage name
 * 3. Defensive: All comparisons use canonical form
 * 4. Extensible: Designed for future entity types (tasks, notes, etc.)
 */

/**
 * Validation severity levels
 * 
 * TICKET 12 FOLLOW-UP (5️⃣): Severity system for future UX polish
 * 
 * Usage:
 * - error: Blocks action, must be fixed
 * - warning: Informational, allows action (future use)
 */
export type ValidationSeverity = 'error' | 'warning';

/**
 * Validation result with severity
 */
export interface ValidationResult {
  valid: boolean;
  severity?: ValidationSeverity;
  code?: string;  // For future error code system
  message?: string;
}

/**
 * Constants for validation rules
 */
export const VALIDATION = {
  LIST_NAME_MIN_LENGTH: 1,
  LIST_NAME_MAX_LENGTH: 100,
  SORT_ORDER: {
    MIN: 0,
    MAX: 9999,
    SYSTEM_LIST_DEFAULT: 9999,
  },
  DELAYS: {
    LONG_PRESS_DRAG: 300, // ms - consistent across app
    LONG_PRESS_MENU: 500, // ms - for context menus
  },
} as const;

/**
 * CANONICAL NAME NORMALIZATION (TICKET 12 FOLLOW-UP 1️⃣)
 * 
 * This is the SINGLE source of truth for name normalization.
 * All name comparisons MUST use this function.
 * 
 * BEHAVIOR:
 * 1. Trim leading/trailing whitespace
 * 2. Collapse internal whitespace to single spaces
 * 3. Convert to lowercase for case-insensitive comparison
 * 
 * EXAMPLES:
 * - "  My List  " → "my list"
 * - "My  List" (double space) → "my list"
 * - "MY LIST" → "my list"
 * - "My\tList" (tab) → "my list"
 * - "My\nList" (newline) → "my list"
 * 
 * PREVENTS:
 * - Duplicate lists with different spacing: "Work" vs "Work " vs "Work  "
 * - Case variations: "Work" vs "work" vs "WORK"
 * - Invisible character issues: tabs, newlines, etc.
 * - Import/export duplication
 * - Search inconsistencies
 * 
 * @param name - Raw name string
 * @returns Canonical normalized form (for comparison only)
 */
export function normalizeNameCanonical(name: string): string {
  return name
    .trim()                           // Remove leading/trailing whitespace
    .replace(/\s+/g, ' ')            // Collapse internal whitespace to single space
    .toLowerCase();                   // Case-insensitive comparison
}

/**
 * DISPLAY NAME PREPARATION
 * 
 * Prepares name for storage and display (NOT for comparison).
 * 
 * BEHAVIOR:
 * 1. Trim leading/trailing whitespace
 * 2. Collapse internal whitespace to single spaces
 * 3. Preserve original case
 * 
 * EXAMPLES:
 * - "  My List  " → "My List"
 * - "My  List" → "My List"
 * - "MY LIST" → "MY LIST" (case preserved)
 * 
 * USE CASE:
 * - Store in database
 * - Display to user
 * - Export
 * 
 * @param name - Raw name string
 * @returns Display-ready name (case preserved)
 */
export function normalizeNameDisplay(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use normalizeNameCanonical() instead
 */
export function normalizeListName(name: string): string {
  return normalizeNameCanonical(name);
}

/**
 * Validate list name
 * Returns error message if invalid, null if valid
 * 
 * TICKET 12 FOLLOW-UP (4️⃣): Rename-safe validation
 */
export function validateListName(name: string): string | null {
  const display = normalizeNameDisplay(name);
  
  if (display.length === 0) {
    return 'List name cannot be empty';
  }
  
  if (display.length > VALIDATION.LIST_NAME_MAX_LENGTH) {
    return `List name cannot exceed ${VALIDATION.LIST_NAME_MAX_LENGTH} characters`;
  }
  
  return null;
}

/**
 * Check if a list name is a duplicate
 * Case-insensitive comparison after normalization
 * 
 * TICKET 12 FOLLOW-UP (4️⃣): Rename-safe with excludeId
 * 
 * @param newName - Name to check
 * @param existingNames - Array of existing list names
 * @param excludeId - Optional: ID to exclude from check (for rename - don't compare against self)
 * @param existingIds - Optional: Parallel array of IDs (must match existingNames length)
 */
export function isDuplicateListName(
  newName: string,
  existingNames: string[],
  excludeId?: string,
  existingIds?: string[]
): boolean {
  const normalizedNew = normalizeNameCanonical(newName);
  
  return existingNames.some((existing, index) => {
    // Skip comparison with excluded ID (for rename)
    if (excludeId && existingIds && existingIds[index] === excludeId) {
      return false;
    }
    
    return normalizeNameCanonical(existing) === normalizedNew;
  });
}

/**
 * Validate and prepare list name for save
 * Returns { valid: true, name: string } or { valid: false, error: string }
 * 
 * TICKET 12 FOLLOW-UP (4️⃣): Rename-safe validation
 * 
 * @param name - Name to validate
 * @param existingNames - Array of existing list names
 * @param excludeId - Optional: ID to exclude from duplicate check (for rename)
 * @param existingIds - Optional: Parallel array of IDs
 */
export function prepareListName(
  name: string,
  existingNames: string[],
  excludeId?: string,
  existingIds?: string[]
): { valid: true; name: string } | { valid: false; error: string } {
  // Validate format
  const validationError = validateListName(name);
  if (validationError) {
    return { valid: false, error: validationError };
  }
  
  const displayName = normalizeNameDisplay(name);
  
  // Check for duplicates using canonical form
  if (isDuplicateListName(displayName, existingNames, excludeId, existingIds)) {
    return { valid: false, error: 'A list with this name already exists' };
  }
  
  return { valid: true, name: displayName };
}

/**
 * Deduplicate and reassign sort orders
 * Ensures no gaps, no duplicates, sequential from 0
 * 
 * @param items - Array of items with sort_order property
 * @returns Items with reassigned sort_order values
 */
export function deduplicateSortOrders<T extends { sort_order: number }>(
  items: T[]
): T[] {
  return items
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, index) => ({
      ...item,
      sort_order: index,
    }));
}

/**
 * ERROR CODE SYSTEM (TICKET 12 FOLLOW-UP 3️⃣)
 * 
 * Structured error codes for better error handling, logging, and future i18n.
 * 
 * ARCHITECTURE:
 * - Errors have machine-readable codes
 * - Codes map to user-friendly messages
 * - Easy to track in analytics
 * - Ready for localization
 * 
 * IMPLEMENTATION STATUS: Designed but not yet enforced
 * MIGRATION PATH: Gradually replace string errors with AppError instances
 */
export enum ErrorCode {
  // Validation errors
  EMPTY_NAME = 'EMPTY_NAME',
  NAME_TOO_LONG = 'NAME_TOO_LONG',
  DUPLICATE_NAME = 'DUPLICATE_NAME',
  INVALID_CHARACTERS = 'INVALID_CHARACTERS',
  
  // Database errors
  DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',
  DB_FOREIGN_KEY_VIOLATION = 'DB_FOREIGN_KEY_VIOLATION',
  DB_NOT_NULL_VIOLATION = 'DB_NOT_NULL_VIOLATION',
  DB_UNIQUE_VIOLATION = 'DB_UNIQUE_VIOLATION',
  DB_TRANSACTION_ERROR = 'DB_TRANSACTION_ERROR',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  
  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured application error
 * 
 * USAGE (future):
 * ```typescript
 * throw new AppError(ErrorCode.DUPLICATE_NAME, 'A list with this name already exists');
 * ```
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public severity: ValidationSeverity = 'error'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Map error codes to user-friendly messages
 * 
 * FUTURE: This becomes the i18n lookup table
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.EMPTY_NAME]: 'Name cannot be empty',
  [ErrorCode.NAME_TOO_LONG]: 'Name is too long',
  [ErrorCode.DUPLICATE_NAME]: 'A list with this name already exists',
  [ErrorCode.INVALID_CHARACTERS]: 'Name contains invalid characters',
  
  [ErrorCode.DB_CONSTRAINT_VIOLATION]: 'This operation violates data integrity rules',
  [ErrorCode.DB_FOREIGN_KEY_VIOLATION]: 'This operation cannot be completed due to related data',
  [ErrorCode.DB_NOT_NULL_VIOLATION]: 'Required information is missing',
  [ErrorCode.DB_UNIQUE_VIOLATION]: 'This item already exists',
  [ErrorCode.DB_TRANSACTION_ERROR]: 'This operation is temporarily unavailable. Please try again.',
  
  [ErrorCode.NETWORK_ERROR]: 'Network error occurred',
  [ErrorCode.CONNECTION_ERROR]: 'Unable to connect. Please check your connection and try again.',
  
  [ErrorCode.UNKNOWN_ERROR]: 'Something went wrong. Please try again.',
};

/**
 * User-friendly error messages for common database errors
 * 
 * TICKET 12 FOLLOW-UP (3️⃣): Enhanced with error code detection
 */
export function getUserFriendlyError(error: unknown): string {
  // Handle AppError instances (future)
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Database constraint violations
    if (message.includes('unique') || message.includes('duplicate')) {
      return ERROR_MESSAGES[ErrorCode.DB_UNIQUE_VIOLATION];
    }
    
    if (message.includes('foreign key')) {
      return ERROR_MESSAGES[ErrorCode.DB_FOREIGN_KEY_VIOLATION];
    }
    
    if (message.includes('constraint')) {
      return ERROR_MESSAGES[ErrorCode.DB_CONSTRAINT_VIOLATION];
    }
    
    if (message.includes('not null')) {
      return ERROR_MESSAGES[ErrorCode.DB_NOT_NULL_VIOLATION];
    }
    
    // Transaction errors
    if (message.includes('transaction')) {
      return ERROR_MESSAGES[ErrorCode.DB_TRANSACTION_ERROR];
    }
    
    // Network/connection errors
    if (message.includes('network')) {
      return ERROR_MESSAGES[ErrorCode.NETWORK_ERROR];
    }
    
    if (message.includes('connection')) {
      return ERROR_MESSAGES[ErrorCode.CONNECTION_ERROR];
    }
  }
  
  // Generic fallback
  return ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR];
}

/**
 * Format validation errors for display
 * Consistent styling across the app
 */
export function formatValidationError(fieldName: string, error: string): string {
  return `${fieldName}: ${error}`;
}
