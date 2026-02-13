/**
 * Validation utilities for data integrity and user input
 * 
 * TICKET 12 FINAL: Production-ready validation with:
 * - Canonical normalization (whitespace collapsing)
 * - Dev-only invariant checks
 * - Shared validation contract for create/rename
 * - Analytics hooks for observability
 * 
 * TICKET 14: Lists → Collections rename
 * - All "list" references changed to "collection"
 * - Function names updated
 * - Constant names updated
 * - Comments updated
 */

/**
 * Development mode check
 */
const __DEV__ = process.env.NODE_ENV !== 'production';

/**
 * Analytics hook interface (no-op by default, ready for future implementation)
 * 
 * USAGE: Replace implementation when analytics provider added
 */
export const Analytics = {
  /**
   * Log validation error for tracking
   * @param context - Where error occurred (e.g., 'CollectionsScreen.create')
   * @param errorType - Type of validation error
   * @param metadata - Additional context
   */
  logValidationError(
    context: string,
    errorType: string,
    metadata?: Record<string, any>
  ): void {
    // No-op by default - implement when analytics added
    if (__DEV__) {
      console.log('[Analytics]', context, errorType, metadata);
    }
  },

  /**
   * Log successful validation for conversion tracking
   */
  logValidationSuccess(context: string): void {
    // No-op by default
    if (__DEV__) {
      console.log('[Analytics]', context, 'success');
    }
  },
};

/**
 * Validation severity levels
 */
export type ValidationSeverity = 'error' | 'warning';

/**
 * Validation result with UX affordances
 */
export interface ValidationResult {
  valid: boolean;
  severity?: ValidationSeverity;
  code?: string;
  message?: string;
  /** Field that should receive focus on error */
  focusField?: string;
  /** Suggest correction to user */
  suggestion?: string;
}

/**
 * Constants for validation rules
 */
export const VALIDATION = {
  COLLECTION_NAME_MIN_LENGTH: 1,
  COLLECTION_NAME_MAX_LENGTH: 100,
  SORT_ORDER: {
    MIN: 0,
    MAX: 9999,
    SYSTEM_COLLECTION_DEFAULT: 9999,
  },
  DELAYS: {
    LONG_PRESS_DRAG: 300, // ms - consistent across app
    LONG_PRESS_MENU: 500, // ms - for context menus
  },
} as const;

/**
 * Dev-only: Check for normalization invariants
 * Throws in development if canonical form contains invalid patterns
 */
function assertNormalizationInvariants(
  original: string,
  canonical: string
): void {
  if (!__DEV__) return;

  // Invariant: Canonical must be trimmed
  if (canonical !== canonical.trim()) {
    throw new Error(
      `INVARIANT VIOLATION: Canonical form not trimmed. Input: "${original}" → "${canonical}"`
    );
  }

  // Invariant: Canonical must not have multiple consecutive spaces
  if (/\s{2,}/.test(canonical)) {
    throw new Error(
      `INVARIANT VIOLATION: Canonical form has multiple spaces. Input: "${original}" → "${canonical}"`
    );
  }

  // Invariant: Canonical must be lowercase
  if (canonical !== canonical.toLowerCase()) {
    throw new Error(
      `INVARIANT VIOLATION: Canonical form not lowercase. Input: "${original}" → "${canonical}"`
    );
  }

  // Invariant: Canonical must not have tabs/newlines
  if (/[\t\n\r]/.test(canonical)) {
    throw new Error(
      `INVARIANT VIOLATION: Canonical form has whitespace chars. Input: "${original}" → "${canonical}"`
    );
  }
}

/**
 * CANONICAL NAME NORMALIZATION
 * 
 * Single source of truth for name comparison.
 * All duplicate checks MUST use this function.
 * 
 * BEHAVIOR:
 * 1. Trim leading/trailing whitespace
 * 2. Collapse internal whitespace to single spaces
 * 3. Convert to lowercase
 * 
 * EXAMPLES:
 * - "  My Collection  " → "my collection"
 * - "My  Collection" (double space) → "my collection"
 * - "MY COLLECTION" → "my collection"
 * - "My\tCollection" (tab) → "my collection"
 * 
 * @param name - Raw name string
 * @returns Canonical normalized form (for comparison only)
 */
export function normalizeNameCanonical(name: string): string {
  const canonical = name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

  // Dev-only invariant checks
  assertNormalizationInvariants(name, canonical);

  return canonical;
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
 * @param name - Raw name string
 * @returns Display-ready name (case preserved)
 */
export function normalizeNameDisplay(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use normalizeNameCanonical() instead
 */
export function normalizeCollectionName(name: string): string {
  return normalizeNameCanonical(name);
}

/**
 * SHARED VALIDATION CONTRACT
 * 
 * Single validation function used by both create AND rename.
 * Ensures identical validation rules across all entry points.
 * 
 * @param name - Name to validate
 * @param context - 'create' or 'rename' (for analytics)
 * @returns ValidationResult with UX affordances
 */
export function validateName(
  name: string,
  context: 'create' | 'rename' = 'create'
): ValidationResult {
  const display = normalizeNameDisplay(name);

  // Empty name check
  if (display.length === 0) {
    Analytics.logValidationError(context, 'empty_name');
    return {
      valid: false,
      severity: 'error',
      code: 'EMPTY_NAME',
      message: 'Name cannot be empty',
      focusField: 'name',
      suggestion: 'Enter a name for your collection',
    };
  }

  // Length check
  if (display.length > VALIDATION.COLLECTION_NAME_MAX_LENGTH) {
    Analytics.logValidationError(context, 'name_too_long', {
      length: display.length,
      max: VALIDATION.COLLECTION_NAME_MAX_LENGTH,
    });
    return {
      valid: false,
      severity: 'error',
      code: 'NAME_TOO_LONG',
      message: `Name cannot exceed ${VALIDATION.COLLECTION_NAME_MAX_LENGTH} characters`,
      focusField: 'name',
      suggestion: `Current: ${display.length} chars. Please shorten.`,
    };
  }

  // All checks passed
  Analytics.logValidationSuccess(context);
  return { valid: true };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use validateName() instead
 */
export function validateCollectionName(name: string): string | null {
  const result = validateName(name, 'create');
  return result.valid ? null : result.message || 'Invalid name';
}

/**
 * Check if a name is a duplicate
 * 
 * Shared by both create and rename flows.
 * 
 * @param newName - Name to check
 * @param existingNames - Array of existing names
 * @param excludeId - Optional: ID to exclude (for rename - don't compare against self)
 * @param existingIds - Optional: Parallel array of IDs
 */
export function isDuplicateName(
  newName: string,
  existingNames: string[],
  excludeId?: string,
  existingIds?: string[]
): boolean {
  const normalizedNew = normalizeNameCanonical(newName);

  // Dev-only: Check for duplicate IDs in existingIds
  if (__DEV__ && existingIds) {
    const idSet = new Set(existingIds);
    if (idSet.size !== existingIds.length) {
      console.warn(
        'VALIDATION WARNING: existingIds contains duplicates. This may cause incorrect duplicate detection.'
      );
    }
  }

  // Dev-only: Verify array lengths match
  if (__DEV__ && existingIds && existingNames.length !== existingIds.length) {
    throw new Error(
      `INVARIANT VIOLATION: existingNames (${existingNames.length}) and existingIds (${existingIds.length}) length mismatch`
    );
  }

  return existingNames.some((existing, index) => {
    // Skip comparison with excluded ID (for rename)
    if (excludeId && existingIds && existingIds[index] === excludeId) {
      return false;
    }

    return normalizeNameCanonical(existing) === normalizedNew;
  });
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use isDuplicateName() instead
 */
export function isDuplicateCollectionName(
  newName: string,
  existingNames: string[],
  excludeId?: string,
  existingIds?: string[]
): boolean {
  return isDuplicateName(newName, existingNames, excludeId, existingIds);
}

/**
 * UNIFIED VALIDATION FOR CREATE/RENAME
 * 
 * Single function that validates name format AND checks for duplicates.
 * Used by both create and rename flows to ensure identical validation.
 * 
 * @param name - Name to validate
 * @param existingNames - Array of existing names
 * @param mode - 'create' or 'rename'
 * @param excludeId - For rename: ID of item being renamed
 * @param existingIds - Parallel array of IDs (optional)
 * @returns ValidationResult with display name if valid
 */
export function validateNameWithDuplicateCheck(
  name: string,
  existingNames: string[],
  mode: 'create' | 'rename' = 'create',
  excludeId?: string,
  existingIds?: string[]
): { valid: true; name: string } | { valid: false; error: ValidationResult } {
  // Step 1: Format validation
  const formatResult = validateName(name, mode);
  if (!formatResult.valid) {
    Analytics.logValidationError(`${mode}.format`, formatResult.code || 'unknown');
    return { valid: false, error: formatResult };
  }

  const displayName = normalizeNameDisplay(name);

  // Step 2: Duplicate check
  if (isDuplicateName(displayName, existingNames, excludeId, existingIds)) {
    Analytics.logValidationError(`${mode}.duplicate`, 'DUPLICATE_NAME', {
      name: displayName,
    });

    return {
      valid: false,
      error: {
        valid: false,
        severity: 'error',
        code: 'DUPLICATE_NAME',
        message: 'A collection with this name already exists',
        focusField: 'name',
        suggestion: 'Try a different name',
      },
    };
  }

  // Success
  Analytics.logValidationSuccess(mode);
  return { valid: true, name: displayName };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use validateNameWithDuplicateCheck() instead
 */
export function prepareCollectionName(
  name: string,
  existingNames: string[],
  excludeId?: string,
  existingIds?: string[]
): { valid: true; name: string } | { valid: false; error: string } {
  const result = validateNameWithDuplicateCheck(
    name,
    existingNames,
    'create',
    excludeId,
    existingIds
  );

  if (result.valid) {
    return { valid: true, name: result.name };
  }

  return { valid: false, error: result.error.message || 'Invalid name' };
}

/**
 * Deduplicate and reassign sort orders
 * Ensures no gaps, no duplicates, sequential from 0
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
 * Error codes for structured error handling
 */
export enum ErrorCode {
  EMPTY_NAME = 'EMPTY_NAME',
  NAME_TOO_LONG = 'NAME_TOO_LONG',
  DUPLICATE_NAME = 'DUPLICATE_NAME',
  INVALID_CHARACTERS = 'INVALID_CHARACTERS',
  DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',
  DB_FOREIGN_KEY_VIOLATION = 'DB_FOREIGN_KEY_VIOLATION',
  DB_NOT_NULL_VIOLATION = 'DB_NOT_NULL_VIOLATION',
  DB_UNIQUE_VIOLATION = 'DB_UNIQUE_VIOLATION',
  DB_TRANSACTION_ERROR = 'DB_TRANSACTION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured application error
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
 * Error message lookup
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.EMPTY_NAME]: 'Name cannot be empty',
  [ErrorCode.NAME_TOO_LONG]: 'Name is too long',
  [ErrorCode.DUPLICATE_NAME]: 'A collection with this name already exists',
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
 * Convert error to user-friendly message
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

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

    if (message.includes('transaction')) {
      return ERROR_MESSAGES[ErrorCode.DB_TRANSACTION_ERROR];
    }

    if (message.includes('network')) {
      return ERROR_MESSAGES[ErrorCode.NETWORK_ERROR];
    }

    if (message.includes('connection')) {
      return ERROR_MESSAGES[ErrorCode.CONNECTION_ERROR];
    }
  }

  return ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR];
}

/**
 * Format validation errors for display
 */
export function formatValidationError(fieldName: string, error: string): string {
  return `${fieldName}: ${error}`;
}
