export function money(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function shortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

export function percent(value: number) {
  return `${Math.round(value)}%`;
}

/**
 * Precision-safe rounding for financial calculations.
 * Prevents JS floating-point accumulation errors (e.g. 0.1 + 0.2 = 0.30000000000000004).
 * Rounds to 2 decimal places using the Number.EPSILON correction.
 */
export function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

