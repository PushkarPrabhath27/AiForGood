import { format, parseISO, differenceInDays } from "date-fns";

/**
 * Format string or Date to standard clinical layout strings.
 */
export function formatDate(date: string | Date, formatStr: string = "MMM dd, yyyy"): string {
  try {
    const parsed = typeof date === "string" ? parseISO(date) : date;
    return format(parsed, formatStr);
  } catch (error) {
    console.error("formatDate parsing anomaly:", error);
    return "N/A";
  }
}

/**
 * Parses ISO date string into a Date object.
 */
export function parseDate(str: string): Date {
  return parseISO(str);
}

/**
 * Computes exact duration in days between two date limits.
 */
export function daysBetween(a: string | Date, b: string | Date): number {
  try {
    const dateA = typeof a === "string" ? parseISO(a) : a;
    const dateB = typeof b === "string" ? parseISO(b) : b;
    return differenceInDays(dateA, dateB);
  } catch (error) {
    console.error("daysBetween calculations anomaly:", error);
    return 0;
  }
}
