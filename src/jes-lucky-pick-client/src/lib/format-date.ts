/**
 * Format a DateTime ISO string to browser locale date-only.
 * E.g., "3/20/2026" (en-US) or "20/03/2026" (en-GB).
 */
export function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString();
}

/**
 * Format a DateTime ISO string to browser locale date + time.
 * E.g., "3/20/2026, 9:00 PM" (en-US).
 */
export function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * Format a DateTime ISO string to a short label for chart axes.
 * E.g., "Mar 20".
 */
export function formatDateShort(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
