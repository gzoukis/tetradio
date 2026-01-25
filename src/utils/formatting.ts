/**
 * Formatting utilities for dates, relative dates, currency, and priority
 * No side effects, no dependencies on React or Expo
 */

export function formatDate(timestamp?: number): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelativeDate(timestamp?: number): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const today = new Date();
  const tomorrow = new Date(today);

  today.setHours(0, 0, 0, 0);
  tomorrow.setDate(today.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return formatDate(timestamp);
}

export function formatCurrency(
  amount: number,
  currency: string = 'EUR'
): string {
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    BRL: 'R$',
  };

  const symbol = symbols[currency] ?? currency;
  return `${symbol}${amount.toFixed(2)}`;
}

export function isToday(timestamp?: number): boolean {
  if (!timestamp) return false;

  const date = new Date(timestamp);
  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isPastDate(timestamp?: number): boolean {
  if (!timestamp) return false;
  return timestamp < Date.now();
}

/**
 * Get user-friendly priority label
 */
export function getPriorityLabel(priority?: number): string {
  switch (priority) {
    case 1:
      return 'Focus';
    case 3:
      return 'Low key';
    case 2:
    default:
      return 'Normal';
  }
}

/**
 * Get priority style object for visual indicators
 * Returns left border width and color
 */
export function getPriorityStyle(priority?: number): {
  borderLeftWidth: number;
  borderLeftColor: string;
} {
  const p = priority ?? 2;
  
  if (p === 1) {
    // Focus - blue left border
    return {
      borderLeftWidth: 4,
      borderLeftColor: '#3b82f6',
    };
  }
  
  // Normal and Low key - no border
  return {
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
  };
}